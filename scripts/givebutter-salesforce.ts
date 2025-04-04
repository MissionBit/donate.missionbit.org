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
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
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
    otel: { type: "boolean", default: false, short: "o" },
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
      yield* Effect.annotateCurrentSpan("foundBy", "opportunity");
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
      ...(emails.length > 0
        ? emailCols.map(
            (col) => `${col} IN (${emails.map(soqlQuote).join(",")})`,
          )
        : []),
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
    const result = yield* Stream.runFold(
      client.contact.query(clauses.join(" OR ")),
      Option.none<SFContact>(),
      (s, a) => semigroup.combine(s, Option.some(a)),
    );
    yield* Effect.annotateCurrentSpan("found", Option.isSome(result));
    return result;
  }).pipe(Effect.withSpan("searchForSalesforceContact"));

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
    yield* Effect.annotateCurrentSpan("updates.length", updates.length);
    if (updates.length > 0) {
      const client = yield* SObjectClient;
      yield* client.campaign.update(sfCampaign.Id, Object.fromEntries(updates));
      const updated: typeof SFCampaign.Type = { ...sfCampaign, ...expected };
      return updated;
    }
    return sfCampaign;
  }).pipe(
    Effect.withSpan("updateCampaignRecord", {
      attributes: {
        Givebutter_Campaign_ID: gbCampaign.id,
        CampaignId: sfCampaign.Id,
      },
    }),
  );

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
      }).pipe(
        Effect.withSpan("createOrFetchCampaignFromGivebutterTransaction", {
          attributes: { Givebutter_Campaign_ID: campaign.id },
        }),
      ),
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
    const keys = ["Donor__c", "Givebutter_Contact_ID__c"] as const;
    const updates = keys.flatMap((k) =>
      contact[k] || contact[k] === expected[k]
        ? ([] as const)
        : ([[k, expected[k]]] as const),
    );
    yield* Effect.annotateCurrentSpan("updates.length", updates.length);
    if (updates.length > 0) {
      yield* Console.log(
        "Updating contact",
        contact.Id,
        updates.map(([k, v]) => [k, v, contact[k] ?? null]),
      );
      const client = yield* SObjectClient;
      yield* client.contact.update(contact.Id, Object.fromEntries(updates));
      const updated: typeof SFContact.Type = { ...contact, ...expected };
      return updated;
    }
    return contact;
  }).pipe(
    Effect.withSpan("updateDonorRecord", {
      attributes: { ContactId: contact.Id },
    }),
  );

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
    const contact = yield* client.contact
      .create(obj)
      .pipe(Effect.map((v) => SFContact.make(v)));
    yield* Effect.annotateCurrentSpan("ContactId", contact.Id);
    return contact;
  }).pipe(
    Effect.withSpan("createDonorRecord", {
      attributes: { Givebutter_Contact_ID: row.contact_data.id },
    }),
  );

export const existingSalesforceContactForGivebutterContact = (
  row: GivebutterTransactionRow,
  opportunity: Option.Option<Opportunity>,
) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const lookupKey = `Givebutter_Contact_ID__c/${row.data.contact_id}`;
    return yield* client.contact.withOptionCache(lookupKey, () =>
      client.contact.get(lookupKey).pipe(
        Effect.flatMap(
          Option.match({
            onSome: Effect.succeedSome,
            onNone: () => searchForSalesforceContact(client, row, opportunity),
          }),
        ),
      ),
    );
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
  }).pipe(
    Effect.withSpan("salesforceContactForGivebutterContact", {
      attributes: {
        Givebutter_Contact_ID: row.data.contact_id,
        OpportunityId: opportunity.pipe(
          Option.map((c) => c.Id),
          Option.getOrNull,
        ),
      },
    }),
  );

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
                    yield* Effect.annotateCurrentSpan(
                      "updates.length",
                      updates.length,
                    );
                    if (updates.length > 0) {
                      yield* Console.log(
                        "Updating RecurringDonation",
                        existing.Id,
                        updates.map(([k, v]) => [k, v, existing[k] ?? null]),
                      );
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
                  }).pipe(
                    Effect.withSpan("updateRecurringDonation", {
                      attributes: { RecurringDonationId: existing.Id },
                    }),
                  ),
                onNone: () =>
                  client.recurringDonation.create(expected).pipe(
                    Effect.map((v) => RecurringDonation.make(v)),
                    Effect.withSpan("createRecurringDonation"),
                  ),
              }),
            ),
          ),
        );
      }).pipe(
        Effect.withSpan(
          "createOrFetchRecurringDonationFromGivebutterTransaction",
          {
            attributes: {
              Givebutter_Plan_ID: plan.id,
              Givebutter_Transaction_ID: row.data.id,
              ContactId: contact.Id,
            },
          },
        ),
      ),
    ),
  );

function stageForGivebutterStatus(
  chargeStatus: (typeof Transaction.Type)["status"],
): Opportunity["StageName"] {
  switch (chargeStatus) {
    case "authorized":
      return "Posted";
    case "pending":
      return "Posted";
    case "succeeded":
      return "Posted - Fully Paid";
    case "failed":
      return "Lost";
    case "cancelled":
      return "Lost";
    default:
      return "Ask Made";
  }
}

function donationRecordTypeForCampaign(optCampaign: Option.Option<SFCampaign>) {
  return Effect.gen(function* () {
    const recordTypes = yield* SalesforceRecordTypes;
    return optCampaign.pipe(
      Option.match({
        onNone: () => recordTypes.Donation,
        onSome: (campaign) =>
          campaign.Type === "Event" || /Gala|Demo Day/i.test(campaign.Name)
            ? recordTypes.Special_Event_Revenue
            : recordTypes.Donation,
      }),
    );
  });
}

const processRow = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const { data: transaction, plan_data: plan } = row;
    if (transaction.plan_id && !plan) {
      yield* Effect.fail(
        `Transaction ${transaction.id} references Plan ${transaction.plan_id} which has not yet been synchronized`,
      );
    }
    if (transaction.amount <= 0) {
      yield* Effect.annotateCurrentSpan("ignored", "zero-dollar");
      return;
    }
    const existing = yield* client.opportunity.get(
      `Givebutter_Transaction_ID__c/${transaction.id}`,
    );
    let contact;
    if (!transaction.email) {
      const optContact = yield* existingSalesforceContactForGivebutterContact(
        row,
        existing,
      );
      if (Option.isNone(optContact)) {
        yield* Effect.annotateCurrentSpan("ignored", "no-email");
        return;
      } else {
        contact = optContact.value;
      }
    } else {
      contact = yield* salesforceContactForGivebutterContact(row, existing);
    }
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
      RecordTypeId: yield* donationRecordTypeForCampaign(campaign),
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
    const res = yield* Option.match(existing, {
      onNone: () =>
        client.opportunity
          .create(expected)
          .pipe(Effect.map((v) => Opportunity.make(v))),
      onSome: (existing) =>
        Effect.gen(function* () {
          const recordTypes = yield* SalesforceRecordTypes;
          const updates = typedEntries(expected).filter(
            ([k]) =>
              k !== "ContactId" &&
              k !== "AccountId" &&
              existing[k] !== expected[k] &&
              expected[k] !== undefined &&
              // Don't update a matching gift's record type
              !(
                k === "RecordTypeId" &&
                existing[k] === recordTypes.Matching_Gift
              ),
          );
          yield* Effect.annotateCurrentSpan("updates.length", updates.length);
          if (updates.length > 0) {
            yield* Console.log(
              "Updating Opportunity",
              existing.Id,
              updates.map(([k, v]) => [k, v, existing[k] ?? null]),
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
        }).pipe(
          Effect.withSpan("updateOpportunity", {
            attributes: { OpportunityId: existing.Id },
          }),
        ),
    });
    yield* Effect.annotateCurrentSpan("OpportunityId", res.Id);
    yield* Effect.annotateCurrentSpan("ContactId", contact.Id);
    yield* Effect.annotateCurrentSpan("AccountId", contact.AccountId);
    yield* campaign.pipe(
      optTraverse((v) => Effect.annotateCurrentSpan("CampaignId", v.Id)),
    );
    yield* recurring.pipe(
      optTraverse((v) =>
        Effect.annotateCurrentSpan("RecurringDonationId", v.Id),
      ),
    );
  }).pipe(
    Effect.withSpan("processRow", {
      attributes: {
        Givebutter_Transaction_ID: row.data.id,
        amount: row.data.amount,
      },
    }),
  );

const mainProgram = Effect.gen(function* () {
  const supabase = yield* SupabaseContext;
  const decodeRow = S.decodeUnknown(GivebutterTransactionRow);
  const tableName = values.all
    ? "givebutter_transactions"
    : "givebutter_transactions_pending_salesforce";
  const rows = yield* evalQuery(() => {
    const r = supabase
      .from(tableName)
      .select(
        "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data, contact_data",
      );
    return values.id ? r.filter("id", "eq", values.id) : r;
  });
  yield* Effect.annotateCurrentSpan("rowCount", rows.length);
  yield* Effect.annotateCurrentSpan("tableName", tableName);
  for (const row of rows) {
    yield* processRow(yield* decodeRow(row));
  }
}).pipe(Effect.withSpan("mainProgram"));

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "givebutter-salesforce" },
  spanProcessor: new BatchSpanProcessor(
    // https://effect.website/docs/guides/observability/telemetry/tracing
    values.otel ? new OTLPTraceExporter() : new ConsoleSpanExporter(),
  ),
}));

async function main() {
  const prog = Effect.scoped(mainProgram).pipe(
    Effect.provide(SalesforceLive),
    Effect.provide(NodeSdkLive),
    Effect.provide(HttpClient.layer),
    Effect.provide(SupabaseContext.Live),
    Effect.catchAllCause(Effect.logError),
    Effect.withSpan("main", { attributes: values }),
  );
  Effect.runPromise(prog);
}

main();
