import {
  Effect,
  Option,
  Predicate,
  Console,
  pipe,
  Order,
  Stream,
} from "effect";
import { Semigroup } from "@effect/typeclass";
import nameParser from "another-name-parser";
import { evalQuery, SupabaseContext } from "src/getSupabaseClient";
import { NodeSdk } from "@effect/opentelemetry";
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Campaign } from "src/givebutter/campaign";
import { Plan } from "src/givebutter/plan";
import { Ticket } from "src/givebutter/ticket";
import { Transaction } from "src/givebutter/transaction";
import * as S from "@effect/schema/Schema";
import { parseArgs } from "node:util";
import { SalesforceLive } from "src/salesforce/layer";
import { HttpClient } from "@effect/platform";
import { SObjectClient } from "src/salesforce/SObjectClient";
import { Contact as GBContact } from "src/givebutter/contact";
import { Contact as SFContact } from "src/salesforce/Contact";
import { Campaign as SFCampaign } from "src/salesforce/Campaign";
import { Opportunity } from "src/salesforce/Opportunity";
import { RecurringDonation } from "src/salesforce/RecurringDonation";
import { Campaign as GBCampaign } from "src/givebutter/campaign";
import { head } from "effect/Array";
import { soql, soqlQuote } from "src/salesforce/soql";
import { expandState } from "src/salesforce/expandState";
import { twoLetterCountryCode } from "src/salesforce/twoLetterCountryCode";
import { SalesforceRecordTypes } from "src/salesforce/http";
import * as EffectInstances from "@effect/typeclass/data/Effect";
import * as OptionInstances from "@effect/typeclass/data/Option";
import { dollarFormatter } from "src/dollars";
import { ShortDateFormat } from "src/dates";

const { values } = parseArgs({
  options: {
    all: { type: "boolean", default: false, short: "a" },
    id: { type: "string" },
  },
});

export class GivebutterTransactionRow extends S.Class<GivebutterTransactionRow>(
  "GivebutterTransactionRow",
)({
  id: S.String,
  created_at: S.String,
  updated_at: S.String,
  data: Transaction,
  campaign_data: S.NullOr(Campaign),
  plan_data: S.NullOr(Plan),
  tickets_data: S.Array(Ticket),
  contact_data: GBContact,
}) {}

const transactionName = ({
  first_name: first,
  last_name: last,
}: S.Schema.Type<typeof Transaction>): ReturnType<typeof nameParser> | null =>
  first && last
    ? {
        first,
        last,
        middle: null,
        suffix: null,
        prefix: null,
        original: `${first} ${last}`,
      }
    : null;

const searchForSalesforceContact = (
  client: SObjectClient["Type"],
  row: GivebutterTransactionRow,
  opportunity: Option.Option<Opportunity>,
) =>
  Effect.gen(function* () {
    const existing = yield* pipe(
      opportunity,
      optTraverse((opp) => client.contact.get(opp.ContactId)),
      Effect.map(Option.flatten),
    );
    if (Option.isSome(existing)) {
      return existing;
    }
    const transaction = row.data;
    const givebutterContactId = String(row.contact_data.id);
    const emails = [
      ...new Set(
        [row.data.email, ...row.contact_data.emails.map((r) => r.value)].filter(
          Predicate.isString,
        ),
      ),
    ];
    const email = head(emails).pipe(Option.getOrNull);
    const parsedName = transactionName(transaction);
    const phone = transaction.phone;
    const emailCols = [
      "Email",
      "npe01__WorkEmail__c",
      "npe01__HomeEmail__c",
      "npe01__AlternateEmail__c",
    ] as const;
    const clauses = [
      soql`Givebutter_Contact_ID__c = ${givebutterContactId}`,
      ...emailCols.map(
        (col) => `${col} IN (${emails.map(soqlQuote).join(",")}`,
      ),
      ...(parsedName && parsedName.last && parsedName.first
        ? [
            soql`(FirstName LIKE ${parsedName.first + "%"} AND LastName = ${
              parsedName.last
            })`,
          ]
        : []),
      ...(phone ? [soql`Phone = ${phone}`] : []),
    ];
    // Choose best contact by (in order of preference): Givebutter ID, email, phone, or name match
    const contactOrder: Order.Order<SFContact> = (a, b) => {
      if (a.Givebutter_Contact_ID__c !== b.Givebutter_Contact_ID__c) {
        if (a.Givebutter_Contact_ID__c === givebutterContactId) {
          return 1;
        } else if (b.Givebutter_Contact_ID__c === givebutterContactId) {
          return -1;
        }
      }
      if (email) {
        for (const k of emailCols) {
          if (a[k] === b[k]) {
            continue;
          } else if (a[k] && emails.includes(a[k])) {
            return 1;
          } else if (b[k] && emails.includes(b[k])) {
            return -1;
          }
        }
      }
      if (phone && a.Phone !== b.Phone) {
        if (a.Phone === phone) {
          return 1;
        } else if (b.Phone === phone) {
          return -1;
        }
      }
      // Anything else must be a name match and we don't rank those
      return 0;
    };
    const semigroup = Semigroup.max(Option.getOrder(contactOrder));
    return yield* Stream.runFold(
      client.contact.query(clauses.join(" OR ")),
      Option.none<SFContact>(),
      (s, a) => semigroup.combine(s, Option.some(a)),
    );
  });

const effectApplicative = EffectInstances.getApplicative();
const optTraverse = OptionInstances.Traversable.traverse(effectApplicative);

function parseGivebutterDate(str: string | null | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T/.exec(str ?? "");
  return m ? m[1] : null;
}

function currentCampaignStatus(
  startDate: string | null,
  endDate: string | null,
  today: string | null,
) {
  if (!today || !startDate || startDate > today) {
    return "Planned";
  } else if (endDate && endDate < today) {
    return "Completed";
  } else {
    return "In Progress";
  }
}

function expectedCampaignFromGivebutter(
  campaign: typeof GBCampaign.Type,
): Effect.Effect<
  Partial<Omit<typeof SFCampaign.Type, "Id">>,
  never,
  SalesforceRecordTypes
> {
  const givebutterCampaignId = String(campaign.id);
  const StartDate = parseGivebutterDate(campaign.created_at);
  const EndDate = parseGivebutterDate(campaign.end_at);
  return SalesforceRecordTypes.pipe(
    Effect.map(
      (recordTypes) =>
        ({
          Name: campaign.title,
          Type: campaign.type === "event" ? "Event" : "Fundraising",
          Description: campaign.description || null,
          Givebutter_Campaign_ID__c: givebutterCampaignId,
          RecordTypeId: recordTypes.Default,
          Status: currentCampaignStatus(
            StartDate,
            EndDate,
            parseGivebutterDate(new Date().toISOString()),
          ),
          StartDate,
          EndDate,
        }) satisfies Partial<Omit<typeof SFCampaign.Type, "Id">>,
    ),
  );
}

const updateCampaignRecord = (
  gbCampaign: typeof GBCampaign.Type,
  sfCampaign: typeof SFCampaign.Type,
) =>
  Effect.gen(function* () {
    const expected = yield* expectedCampaignFromGivebutter(gbCampaign);
    const keys = [
      "Name",
      "Type",
      "Description",
      "Status",
      "StartDate",
      "EndDate",
    ] as const;
    const updates = keys.flatMap((k) =>
      sfCampaign[k] === expected[k] && expected[k] !== undefined
        ? []
        : ([[k, expected[k]]] as const),
    );
    if (updates.length > 0) {
      const client = yield* SObjectClient;
      yield* client.campaign.update(sfCampaign.Id, Object.fromEntries(updates));
      const updated: typeof SFCampaign.Type = { ...sfCampaign, ...expected };
      return updated;
    }
    return sfCampaign;
  });

const createOrFetchCampaignFromGivebutterTransaction = (
  row: GivebutterTransactionRow,
  opportunity: Option.Option<Opportunity>,
) =>
  Option.fromNullable(row.campaign_data).pipe(
    optTraverse((campaign) =>
      Effect.gen(function* () {
        const client = yield* SObjectClient;
        const lookupKey = opportunity.pipe(
          Option.flatMapNullable((opp) => opp.CampaignId),
          Option.getOrElse(() => `Givebutter_Campaign_ID__c/${campaign.id}`),
        );
        return yield* client.campaign.withCache(lookupKey, () =>
          client.campaign.get(lookupKey).pipe(
            Effect.flatMap(
              Option.match({
                onSome: (sfCampaign) =>
                  updateCampaignRecord(campaign, sfCampaign),
                onNone: () =>
                  expectedCampaignFromGivebutter(campaign).pipe(
                    Effect.andThen(client.campaign.create),
                  ),
              }),
            ),
          ),
        );
      }),
    ),
  );

const updateDonorRecord = (
  row: GivebutterTransactionRow,
  contact: typeof SFContact.Type,
) =>
  Effect.gen(function* () {
    const expected = yield* expectedDonorFromRow(row);
    const contactId = contact.Id;
    if (!contact.AccountId) {
      yield* Effect.fail(
        new Error(`Expecting AccountId for existing contact ${contactId}`),
      );
    }
    const keys = [
      "Donor__c",
      "Givebutter_Contact_ID__c",
      "HasOptedOutOfEmail",
      "npsp__Do_Not_Contact__c",
    ] as const;
    const updates = keys.flatMap((k) =>
      contact[k] === expected[k] || expected[k] === undefined
        ? ([] as const)
        : ([[k, expected[k]]] as const),
    );
    if (updates.length > 0) {
      yield* Console.log("Updating contact", contact.Id, updates);
      const client = yield* SObjectClient;
      yield* client.contact.update(contact.Id, Object.fromEntries(updates));
      const updated: typeof SFContact.Type = { ...contact, ...expected };
      return updated;
    }
    return contact;
  });

const expectedDonorFromRow = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    const recordTypes = yield* SalesforceRecordTypes;
    const transaction = row.data;
    const { address } = transaction;
    const givebutterContactId = String(row.contact_data.id);
    const email = transaction.email;
    const parsedName =
      transactionName(transaction) ??
      nameParser(
        transaction.giving_space?.name ??
          (email ? email.split("@")[0] : "Anonymous Donor"),
      );
    const phone = transaction.phone;
    const nameFields = () => {
      const NAME_FIELD_MAP = [
        ["first", "FirstName"],
        ["middle", "MiddleName"],
        ["suffix", "Suffix"],
      ] as const satisfies readonly (readonly [
        keyof ReturnType<typeof nameParser>,
        keyof typeof SFContact.Type,
      ])[];
      if (parsedName.last === null) {
        return { LastName: parsedName.original };
      }
      return {
        ...Object.fromEntries(
          NAME_FIELD_MAP.flatMap(([fromKey, toKey]) =>
            parsedName[fromKey] ? [[toKey, parsedName[fromKey]]] : [],
          ),
        ),
        LastName: parsedName.last,
      } satisfies Partial<
        Pick<
          typeof SFContact.Type,
          "LastName" | "FirstName" | "MiddleName" | "Suffix"
        >
      >;
    };
    const optOut = !row.contact_data.is_email_subscribed;
    const expected: Partial<Omit<typeof SFContact.Type, "Id">> = {
      ...(optOut
        ? [
            ["HasOptedOutOfEmail", true],
            ["npsp__Do_Not_Contact__c", true],
          ]
        : [["Agree_to_receive_promotional_materials__c", true]]),
      ...nameFields(),
      ...Object.fromEntries(
        [
          ["Phone", phone],
          [
            "Preferred_Name_Nickname__c",
            (!transaction.giving_space ||
            transaction.giving_space.name === "Anonymous"
              ? null
              : transaction.giving_space.name) || parsedName.original,
          ],
          ["MailingCity", address?.city],
          ["MailingState", expandState(address?.state)],
          ["MailingCountryCode", twoLetterCountryCode(address?.country)],
          ["MailingPostalCode", address?.zipcode],
          [
            "MailingStreet",
            [address?.address_1, address?.address_2].filter(Boolean).join("\n"),
          ],
        ].flatMap(([k, v]) => (v ? [[k, v]] : [])),
      ),
      ...(email ? { Email: email } : {}),
      Donor__c: true,
      Givebutter_Contact_ID__c: givebutterContactId,
      RecordTypeId: recordTypes.General,
    };
    return expected;
  });

const createDonorRecord = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const obj = yield* expectedDonorFromRow(row);
    return yield* client.contact
      .create(obj)
      .pipe(Effect.map((v) => SFContact.make(v)));
  });

export const salesforceContactForGivebutterContact = (
  row: GivebutterTransactionRow,
  opportunity: Option.Option<Opportunity>,
) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const lookupKey = `Givebutter_Contact_ID__c/${row.data.contact_id}`;
    const record: SFContact = yield* client.contact.withCache(lookupKey, () =>
      client.contact.get(lookupKey).pipe(
        Effect.flatMap(
          Option.match({
            onSome: Effect.succeedSome,
            onNone: () => searchForSalesforceContact(client, row, opportunity),
          }),
        ),
        // Update the existing record or create a new one
        Effect.flatMap(
          Option.match({
            onSome: (contact) => updateDonorRecord(row, contact),
            onNone: () => createDonorRecord(row),
          }),
        ),
      ),
    );
    return record;
  });

function planName(plan: typeof Plan.Type): string {
  const donor = [plan.first_name, plan.last_name].filter(Boolean).join(" ");
  const freq = { monthly: "mo", quarterly: "qtr", yearly: "yr" }[
    plan.frequency
  ];
  const dateParts = plan.start_at.split(/ /g)[0].split(/-/g);
  const mmddyyyy = [dateParts[1], dateParts[2], dateParts[0]].join("/");
  return `${donor} Recurring ${dollarFormatter.format(plan.amount)}/${freq} ${mmddyyyy} ${plan.id}`;
}

function planFrequency(
  plan: typeof Plan.Type,
): Pick<
  RecurringDonation,
  "npe03__Installment_Period__c" | "npsp__InstallmentFrequency__c"
> {
  switch (plan.frequency) {
    case "monthly":
      return {
        npsp__InstallmentFrequency__c: 1,
        npe03__Installment_Period__c: "Monthly",
      };
    case "quarterly":
      return {
        npsp__InstallmentFrequency__c: 3,
        npe03__Installment_Period__c: "Monthly",
      };
    case "yearly":
      return {
        npsp__InstallmentFrequency__c: 1,
        npe03__Installment_Period__c: "Yearly",
      };
  }
}

function givebutterToISODate(date: string): string {
  // '2024-07-26 22:04:32' to '2024-07-26T22:04:32Z'
  return date.replace(/^(\d+-\d+-\d+) (\d+:\d+:\d+)$/, "$1T$2Z");
}

function planStatus(
  plan: typeof Plan.Type,
): Pick<RecurringDonation, "npsp__Status__c" | "npsp__EndDate__c"> {
  const npsp__EndDate__c =
    plan.status === "active"
      ? null
      : givebutterToISODate(plan.next_bill_date).split(/T/)[0];
  const npsp__Status__c = {
    active: "Active",
    cancelled: "Closed",
    ended: "Closed",
    past_due: "Lapsed",
    paused: "Paused",
  }[plan.status];
  return { npsp__Status__c, npsp__EndDate__c };
}

function planDates(plan: typeof Plan.Type) {
  const established = givebutterToISODate(plan.start_at).split(/T/)[0];
  const dayOfMonth = established.match(/^\d+-0?(\d+)-/)?.[1] ?? "1";
  return {
    npe03__Date_Established__c: established,
    npsp__Day_of_Month__c: dayOfMonth,
  };
}

function typedEntries<T extends { [k: string]: unknown }>(o: T) {
  return Object.entries(o) as {
    [k in keyof T]: [k, T[k]];
  }[keyof T & string][];
}

export const createOrFetchRecurringDonationFromGivebutterTransaction = (
  row: GivebutterTransactionRow,
  opportunity: Option.Option<Opportunity>,
  contact: SFContact,
) =>
  Option.fromNullable(row.plan_data).pipe(
    optTraverse((plan) =>
      Effect.gen(function* () {
        const client = yield* SObjectClient;
        const expected = {
          Name: planName(plan),
          npe03__Contact__c: contact.Id,
          npe03__Amount__c: plan.amount,
          ...planStatus(plan),
          ...planFrequency(plan),
          ...planDates(plan),
          Givebutter_Plan_ID__c: plan.id,
          Stripe_Subscription_ID__c: null,
        } satisfies Omit<RecurringDonation, "Id">;
        const lookupKey = opportunity.pipe(
          Option.flatMapNullable((opp) => opp.npe03__Recurring_Donation__c),
          Option.getOrElse(() => `Givebutter_Plan_ID__c/${plan.id}`),
        );
        return yield* client.recurringDonation.withCache(lookupKey, () =>
          client.recurringDonation.get(lookupKey).pipe(
            Effect.flatMap(
              Option.match({
                onSome: (existing: RecurringDonation) =>
                  Effect.gen(function* () {
                    const updates = typedEntries(expected).filter(
                      ([k]) =>
                        existing[k] !== expected[k] &&
                        expected[k] !== undefined,
                    );
                    if (updates.length > 0) {
                      yield* client.recurringDonation.update(
                        existing.Id,
                        Object.fromEntries(updates),
                      );
                      return RecurringDonation.make({
                        ...existing,
                        ...expected,
                      });
                    }
                    return existing;
                  }),
                onNone: () =>
                  client.recurringDonation
                    .create(expected)
                    .pipe(Effect.map((v) => RecurringDonation.make(v))),
              }),
            ),
          ),
        );
      }),
    ),
  );

function stageForGivebutterStatus(
  chargeStatus: (typeof Transaction.Type)["status"],
): string {
  switch (chargeStatus) {
    case "authorized":
      return "01-Pledged";
    case "succeeded":
      return "02-Won";
    case "failed":
      return "03-Lost";
    case "cancelled":
      return "03-Lost";
    default:
      return "01-Pledged";
  }
}
const processRow = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    // TODO implement observability
    const client = yield* SObjectClient;
    const { data: transaction, plan_data: plan } = row;
    const existing = yield* client.opportunity.get(
      `Givebutter_Transaction_ID__c/${transaction.id}`,
    );
    const contact = yield* salesforceContactForGivebutterContact(row, existing);
    const campaign = yield* createOrFetchCampaignFromGivebutterTransaction(
      row,
      existing,
    );
    const recurring =
      yield* createOrFetchRecurringDonationFromGivebutterTransaction(
        row,
        existing,
        contact,
      );
    const recordTypes = yield* SalesforceRecordTypes;
    const closeDate = transaction.created_at;
    const stageName = stageForGivebutterStatus(transaction.status);
    const opportunityName = [
      transaction.first_name,
      transaction.last_name,
      transaction.giving_space &&
      transaction.giving_space.name !==
        `${transaction.first_name} ${transaction.last_name}`
        ? `(${transaction.giving_space.name})`
        : null,
      dollarFormatter.format(transaction.amount),
      plan ? "Recurring" : null,
      "Donation",
      ShortDateFormat.format(new Date(closeDate)),
    ]
      .filter(Boolean)
      .join(" ");
    const expected = {
      RecordTypeId: recordTypes.Donation,
      ContactId: contact.Id,
      AccountId: contact.AccountId,
      npe03__Recurring_Donation__c: Option.map(recurring, (v) => v.Id).pipe(
        Option.getOrNull,
      ),
      StageName: stageName,
      Name: opportunityName,
      Amount: transaction.amount,
      Payment_Fees__c: transaction.fee - transaction.fee_covered,
      CloseDate: yield* Option.fromNullable(parseGivebutterDate(closeDate)),
      Givebutter_Transaction_ID__c: transaction.id,
      Form_of_Payment__c: "Givebutter",
      CampaignId: Option.map(campaign, (v) => v.Id).pipe(Option.getOrNull),
    } satisfies Partial<Omit<Opportunity, "Id">>;
    return yield* Option.match(existing, {
      onNone: () =>
        client.opportunity
          .create(expected)
          .pipe(Effect.map((v) => Opportunity.make(v))),
      onSome: (existing) =>
        Effect.gen(function* () {
          const updates = typedEntries(expected).filter(
            ([k]) =>
              k !== "ContactId" &&
              k !== "AccountId" &&
              existing[k] !== expected[k] &&
              expected[k] !== undefined,
          );
          if (updates.length > 0) {
            yield* Effect.annotateCurrentSpan(
              "prev",
              Object.fromEntries(updates.map(([k]) => [k, existing[k]])),
            );
            yield* client.opportunity.update(
              existing.Id,
              Object.fromEntries(updates),
            );
            return Opportunity.make({
              ...existing,
              ...expected,
            });
          }
          return existing;
        }),
    });
  }).pipe(Effect.withSpan("processRow", { attributes: { id: row.data.id } }));

const mainProgram = Effect.gen(function* () {
  const supabase = yield* SupabaseContext;
  const decodeRow = S.decodeUnknown(GivebutterTransactionRow);
  yield* evalQuery(() => {
    const r = supabase
      .from(
        values.all
          ? "givebutter_transactions"
          : "givebutter_transactions_pending_salesforce",
      )
      .select(
        "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data, contact_data",
      );
    return values.id ? r.filter("id", "eq", values.id) : r;
  }).pipe(
    Effect.flatMap(
      Effect.forEach((row) => decodeRow(row).pipe(Effect.flatMap(processRow)), {
        discard: true,
      }),
    ),
  );
});

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "givebutter-salesforce" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

async function main() {
  const prog = Effect.scoped(mainProgram).pipe(
    Effect.provide(SalesforceLive),
    Effect.provide(NodeSdkLive),
    Effect.provide(HttpClient.layer),
    Effect.provide(SupabaseContext.Live),
  );
  Effect.runPromise(prog);
}

main();
