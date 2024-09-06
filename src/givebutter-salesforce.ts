import * as S from "@effect/schema/Schema";
import nameParser from "another-name-parser";
import {
  Campaign,
  Contact,
  ContactResult,
  ContactSearchResult,
  SalesforceClient,
  expandState,
  sObject,
  sQuery,
  soql,
} from "src/salesforce";
import { FormatBlocksOptions } from "./FormatBlocksOptions";
import { Transaction } from "src/givebutter/transaction";
import { dollarFormatter } from "src/dollars";
import { ShortDateFormat } from "src/dates";

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type GivebutterTransactionOptions = FormatBlocksOptions;

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
  options: GivebutterTransactionOptions,
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
  const campaignRes = await createOrFetchCampaignFromGivebutterTransaction(
    client,
    options,
  );
  const CampaignId = campaignRes?.CampaignId || null;
  const { ContactId, AccountId } =
    await createOrFetchContactFromGivebutterTransaction(client, options);
  const existing = await opportunityApi.getFields(
    `Givebutter_Transaction_ID__c/${transaction.id}`,
    ["Id", "Name", "StageName", "CampaignId"],
  );
  if (existing) {
    console.log(
      `Existing Opportunity record found ${existing.Id} for transaction ${transaction.id}`,
    );
    if (
      existing.Name !== opportunityName ||
      existing.StageName !== stageName ||
      existing.CampaignId !== CampaignId
    ) {
      console.log(
        `Updating Opportunity ${existing.Id} with new name ${opportunityName} and stage ${stageName} and campaign ${CampaignId}`,
      );
      await opportunityApi.update(existing.Id, {
        Name: opportunityName,
        StageName: stageName,
        CampaignId,
      });
      return { type: "update-existing", OpportunityId: existing.Id };
    } else {
      return { type: "existing", OpportunityId: existing.Id };
    }
  }
  const getRecurringDetails = async () => {
    // TODO: implement recurring donations based on plan
    if (!plan) {
      return {};
    }
    return {};
  };
  const opportunity = await opportunityApi.create({
    RecordTypeId: client.recordTypeIds.Donation,
    ContactId,
    AccountId,
    ...(await getRecurringDetails()),
    StageName: stageName,
    Name: opportunityName,
    Amount: transaction.amount.toFixed(2),
    Payment_Fees__c: (transaction.fee - transaction.fee_covered).toFixed(2),
    CloseDate: closeDate,
    Givebutter_Transaction_ID__c: transaction.id,
    Form_of_Payment__c: "Givebutter",
    CampaignId,
  });
  console.log(
    `Created Opportunity ${opportunity.id} for Transaction ${transaction.id}`,
  );

  return { type: "created", contact: { ContactId, AccountId }, opportunity };
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
  options: GivebutterTransactionOptions,
): Promise<ExtendedContactResult> {
  const { transaction } = options;
  const givebutterContactId = String(transaction.contact_id);
  const contactApi = sObject(client, "contact");
  const fields = [
    "Id",
    "AccountId",
    "Email",
    "Phone",
    "FirstName",
    "LastName",
    "Donor__c",
    "Givebutter_Contact_ID__c",
  ] as const;
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
  let existingContact = await contactApi.getFields(
    `Givebutter_Contact_ID__c/${givebutterContactId}`,
    fields,
  );
  if (!existingContact) {
    const clauses = [
      soql`Givebutter_Contact_ID__c = ${givebutterContactId}`,
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
      `SELECT Id, AccountId, Email, Phone, FirstName, LastName, Donor__c, Givebutter_Contact_ID__c FROM Contact WHERE ${clauses.join(
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
        } else if (
          givebutterContactId &&
          record.Givebutter_Contact_ID__c === givebutterContactId
        ) {
          return 3;
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
    existingContact = chooseBestContactRecord(records);
  }
  if (existingContact) {
    const contactId = existingContact.Id;
    if (!existingContact.AccountId) {
      throw new Error(`Expecting AccountId for existing contact ${contactId}`);
    }
    const updates: Partial<
      Pick<Contact, "Donor__c" | "Givebutter_Contact_ID__c">
    > = {};
    if (!existingContact.Donor__c) {
      updates.Donor__c = true;
    }
    if (!existingContact.Givebutter_Contact_ID__c) {
      updates.Givebutter_Contact_ID__c = givebutterContactId;
    }
    const type = Object.keys(updates).length > 0 ? "update" : "read";
    if (type === "update") {
      await sObject(client, "contact").update(contactId, updates);
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
      Givebutter_Contact_ID__c: givebutterContactId,
      RecordTypeId: client.recordTypeIds.General,
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

const cachedCampaigns = new WeakMap<
  SalesforceClient,
  Map<string, Promise<CampaignResult>>
>();
function getCampaignCache(client: SalesforceClient) {
  let m = cachedCampaigns.get(client);
  if (!m) {
    m = new Map();
    cachedCampaigns.set(client, m);
  }
  return m;
}

export interface CampaignResult {
  type: "create" | "read" | "update";
  CampaignId: Campaign["Id"];
}

async function withCampaignCache(
  client: SalesforceClient,
  campaign: GivebutterTransactionOptions["campaign"],
  fn: (
    campaign: NonNullable<GivebutterTransactionOptions["campaign"]>,
  ) => Promise<CampaignResult>,
): Promise<null | CampaignResult> {
  const cache = getCampaignCache(client);
  if (campaign === null) {
    return null;
  }
  const givebutterCampaignId = String(campaign.id);
  const cachedId = cache.get(givebutterCampaignId);
  if (cachedId !== undefined) {
    return cachedId;
  }
  const promise = fn(campaign);
  cache.set(
    givebutterCampaignId,
    promise.then(({ CampaignId }) => ({ type: "read", CampaignId })),
  );
  return promise;
}

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

export async function createOrFetchCampaignFromGivebutterTransaction(
  client: SalesforceClient,
  options: GivebutterTransactionOptions,
): Promise<CampaignResult | null> {
  return withCampaignCache(
    client,
    options.campaign,
    async (campaign): Promise<CampaignResult> => {
      const givebutterCampaignId = String(campaign.id);
      const campaignApi = sObject(client, "campaign");
      const fields = [
        "Id",
        "Name",
        "Type",
        "RecordTypeId",
        "Description",
        "Status",
        "StartDate",
        "EndDate",
        "Givebutter_Campaign_ID__c",
      ] as const;
      const existingCampaign = await campaignApi.getFields(
        `Givebutter_Campaign_ID__c/${givebutterCampaignId}`,
        fields,
      );
      const StartDate = parseGivebutterDate(campaign.created_at);
      const EndDate = parseGivebutterDate(campaign.end_at);

      const campaignData = {
        Name: campaign.title,
        Type: campaign.type === "event" ? "Event" : "Fundraising",
        Description: campaign.description || null,
        Givebutter_Campaign_ID__c: givebutterCampaignId,
        RecordTypeId: client.recordTypeIds.Default,
        Status: currentCampaignStatus(
          StartDate,
          EndDate,
          parseGivebutterDate(new Date().toISOString()),
        ),
        StartDate,
        EndDate,
      } satisfies Partial<Omit<Campaign, "Id">>;
      if (existingCampaign) {
        const campaignId = existingCampaign.Id;
        const updates = (
          Object.entries(campaignData) as Entries<typeof campaignData>
        ).filter(([k, v]) => v !== existingCampaign[k]);
        const type = updates.length > 0 ? "update" : "read";
        if (type === "update") {
          await campaignApi.update(campaignId, Object.fromEntries(updates));
        }
        console.log(
          `Found existing ${type} campaign ${campaignId} for ${givebutterCampaignId}`,
        );
        return {
          type,
          CampaignId: campaignId,
        };
      }
      const res = await campaignApi.create(campaignData);
      console.log(`Created new campaign ${res.id} for ${givebutterCampaignId}`);
      return { type: "create", CampaignId: res.id };
    },
  );
}
