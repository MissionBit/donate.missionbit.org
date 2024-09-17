import { Effect, Option, Predicate, pipe, Order, Stream } from "effect";
import { Semigroup, Traversable } from "@effect/typeclass";
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
import { Campaign as GBCampaign } from "src/givebutter/campaign";
import { head } from "effect/Array";
import { soql, soqlQuote } from "src/salesforce/soql";
import { expandState } from "src/salesforce/expandState";
import { twoLetterCountryCode } from "src/salesforce/twoLetterCountryCode";
import { SalesforceRecordTypes } from "src/salesforce/http";
import * as EffectInstances from "@effect/typeclass/data/Effect";
import * as OptionInstances from "@effect/typeclass/data/Option";

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
) =>
  Effect.gen(function* () {
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
      sfCampaign[k] === expected[k] ? [] : [[k, expected[k]]],
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
) =>
  Option.fromNullable(row.campaign_data).pipe(
    optTraverse((campaign) =>
      Effect.gen(function* () {
        const client = yield* SObjectClient;
        return yield* client.campaign
          .get(`Givebutter_Campaign_ID__c/${campaign.id}`)
          .pipe(
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
      contact[k] === expected[k] ? [] : [[k, expected[k]]],
    );
    if (updates.length > 0) {
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
      const NAME_FIELD_MAP: [
        keyof ReturnType<typeof nameParser>,
        keyof typeof SFContact.Type,
      ][] = [
        ["first", "FirstName"],
        ["middle", "MiddleName"],
        ["suffix", "Suffix"],
      ];
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
      };
    };
    const optOut = !row.contact_data.is_email_subscribed;
    return {
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
  });

const createDonorRecord = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const obj = yield* expectedDonorFromRow(row);
    return yield* client.contact.create(obj);
  });

export const salesforceContactForGivebutterContact = (
  row: GivebutterTransactionRow,
) =>
  Effect.gen(function* () {
    const client = yield* SObjectClient;
    const record: typeof SFContact.Type = yield* client.contact
      .get(`Givebutter_Contact_ID__c/${row.data.contact_id}`)
      .pipe(
        Effect.flatMap(
          Option.match({
            onSome: Effect.succeedSome,
            onNone: () => searchForSalesforceContact(client, row),
          }),
        ),
        // Update the existing record or create a new one
        Effect.flatMap(
          Option.match({
            onSome: Effect.succeed,
            onNone: () => createDonorRecord(row),
          }),
        ),
        Effect.flatMap((contact) => updateDonorRecord(row, contact)),
      );
    return record;
  });

const processRow = (row: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    // TODO implement contact cache
    // TODO implement campaign cache
    // TODO implement recurring donation cache
    // TODO opportunity
    // TODO recurring
    const contact = yield* salesforceContactForGivebutterContact(row);
    const campaign = yield* createOrFetchCampaignFromGivebutterTransaction(row);

    // const metadata = await createOrFetchOpportunityFromGivebutterTransaction(
    //   client,
    //   info,
    // );
    // await supabase
    //   .from("givebutter_salesforce")
    //   .upsert({ id: row.id, metadata });
    // console.log(`Resolved ${row.id} ${JSON.stringify(metadata, null, 2)}`);
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
