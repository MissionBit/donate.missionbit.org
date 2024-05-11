import { Effect } from "effect";
import * as S from "@effect/schema/Schema";
import nameParser from "another-name-parser";
import {
  Contact,
  ContactResult,
  ContactSearchResult,
  SalesforceClient,
  expandState,
  login,
  sObject,
  sQuery,
  soql,
} from "src/salesforce";
import { FormatBlocksOptions } from "./givebutter-slack";
import { getSupabaseClient } from "src/getSupabaseClient";
import { Campaign } from "src/givebutter/campaign";
import { Transaction } from "src/givebutter/transaction";
import { Plan } from "src/givebutter/plan";
import { Ticket } from "src/givebutter/ticket";
import { dollarFormatter } from "src/dollars";
import { ShortDateFormat } from "src/dates";

export interface ExtendedContactResult extends ContactResult {
  type: "create" | "read" | "update";
}

function twoLetterCountryCode(country: string | null | undefined) {
  if (country?.length === 2) {
    return country;
  } else if (country === "USA") {
    return "US";
  }
  return null;
}

function stageForGivebutterStatus(
  chargeStatus: S.Schema.Type<typeof Transaction>["status"],
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

export async function createOrFetchOpportunityFromGivebutterTransaction(
  client: SalesforceClient,
  options: FormatBlocksOptions,
) {
  if (options.transaction.amount <= 0) {
    // skip zero-dollar transactions
    return { type: "ignored", reason: "zero-dollar" };
  }
  const { transaction, plan } = options;
  const opportunityApi = sObject(client, "opportunity");
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
  const existing = await opportunityApi.getFields(
    `Givebutter_Transaction_ID__c/${transaction.id}`,
    ["Id", "Name", "StageName"],
  );
  if (existing) {
    console.log(
      `Existing Opportunity record found ${existing.Id} for transaction ${transaction.id}`,
    );
    if (existing.Name !== opportunityName || existing.StageName !== stageName) {
      console.log(
        `Updating Opportunity ${existing.Id} with new name ${opportunityName} and stage ${stageName}`,
      );
      await opportunityApi.update(existing.Id, {
        Name: opportunityName,
        StageName: stageName,
      });
      return { type: "update-existing", OpportunityId: existing.Id };
    } else {
      return { type: "existing", OpportunityId: existing.Id };
    }
  }
  const contact = await createOrFetchContactFromGivebutterTransaction(
    client,
    options,
  );
  const getRecurringDetails = async () => {
    // TODO: implement recurring donations based on plan
    if (!plan) {
      return {};
    }
    return {};
  };
  const opportunity = await opportunityApi.create({
    ...contact,
    ...(await getRecurringDetails()),
    Type: "Donation",
    StageName: stageName,
    Name: opportunityName,
    Amount: transaction.amount.toFixed(2),
    Payment_Fees__c: (transaction.fee - transaction.fee_covered).toFixed(2),
    CloseDate: closeDate,
    Givebutter_Transaction_ID__c: transaction.id,
    Form_of_Payment__c: "Givebutter",
  });
  console.log(
    `Created Opportunity ${opportunity.id} for Transaction ${transaction.id}`,
  );

  return { type: "created", contact, opportunity };
}

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

export async function createOrFetchContactFromGivebutterTransaction(
  client: SalesforceClient,
  options: FormatBlocksOptions,
): Promise<ExtendedContactResult> {
  const { transaction } = options;
  const email = transaction.email;
  const parsedName =
    transactionName(transaction) ??
    nameParser(
      transaction.giving_space?.name ??
        (email ? email.split("@")[0] : "Anonymous Donor"),
    );
  const customerInfo = email
    ? `${parsedName.original} <${email}>`
    : parsedName.original;
  const phone = transaction.phone;
  const clauses = [
    ...(email ? [soql`Email = ${email}`] : []),
    parsedName.last && parsedName.first
      ? soql`(FirstName LIKE ${parsedName.first + "%"} AND LastName = ${
          parsedName.last
        })`
      : soql`Name = ${parsedName.original}`,
    ...(phone ? [soql`Phone = ${phone}`] : []),
  ];
  const { records } = await sQuery<ContactSearchResult>(
    client,
    `SELECT Id, AccountId, Email, Phone, FirstName, LastName, Donor__c FROM Contact WHERE ${clauses.join(
      " OR ",
    )}`,
  );
  const chooseBestContactRecord = (
    records: ContactSearchResult[],
  ): ContactSearchResult | null => {
    let bestRecord = null;
    function rankRecord(record: ContactSearchResult | null): number {
      if (!record) {
        return -1;
      } else if (email && record.Email === email) {
        return 2;
      } else if (record.Phone === phone) {
        return 1;
      }
      return 0;
    }
    // First record with Email or Phone match.
    for (const record of records) {
      if (rankRecord(record) > rankRecord(bestRecord)) {
        bestRecord = record;
      }
    }
    return bestRecord;
  };
  const nameFields = () => {
    const NAME_FIELD_MAP: [
      keyof ReturnType<typeof nameParser>,
      keyof Contact,
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
  const existingContact = chooseBestContactRecord(records);
  if (existingContact) {
    const contactId = existingContact.Id;
    const type = !existingContact.Donor__c ? "update" : "read";
    if (!existingContact.Donor__c) {
      await sObject(client, "contact").update(contactId, {
        Donor__c: true,
      });
    }
    if (!existingContact.AccountId) {
      throw new Error(`Expecting AccountId for existing contact ${contactId}`);
    }
    console.log(
      `Found existing contact ${contactId} account ${existingContact.AccountId} for ${customerInfo}`,
    );
    return {
      type,
      ContactId: contactId,
      AccountId: existingContact.AccountId,
    };
  } else {
    const { address } = transaction;
    const contactApi = sObject(client, "contact");
    const res = await contactApi.create({
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
    });
    const fields = await contactApi.getFields(res.id, ["Id", "AccountId"]);
    const AccountId = fields?.AccountId;
    if (!AccountId) {
      throw new Error(`Expecting AccountId for new contact ${res.id}`);
    }
    console.log(`Created contact ${res.id} for ${customerInfo}`);
    return { type: "create", ContactId: res.id, AccountId };
  }
}

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("givebutter_transactions_pending_salesforce")
    .select(
      "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data",
    );
  if (error) {
    console.error(error);
    throw error;
  }
  const client = await login();
  for (const row of data) {
    const info = await Effect.all({
      transaction: S.decodeUnknown(Transaction)(row.data),
      campaign: row.campaign_data
        ? S.decodeUnknown(Campaign)(row.campaign_data)
        : Effect.succeed(null),
      plan: row.plan_data
        ? S.decodeUnknown(Plan)(row.plan_data)
        : Effect.succeed(null),
      tickets: Effect.all(
        (row.tickets_data as unknown[]).map((data) =>
          S.decodeUnknown(Ticket)(data),
        ),
      ),
    }).pipe(Effect.runPromise);
    const metadata = await createOrFetchOpportunityFromGivebutterTransaction(
      client,
      info,
    );
    await supabase
      .from("givebutter_salesforce")
      .insert({ id: row.id, metadata });
    console.log(`Resolved ${row.id} ${JSON.stringify(metadata, null, 2)}`);
  }
}

main();
