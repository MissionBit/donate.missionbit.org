import * as S from "@effect/schema/Schema";
import { fetch } from "cross-fetch";
import {
  fetchInvoiceWithPaymentIntent,
  fetchSessionPaymentIntent,
  invoiceTemplate,
} from "../stripeEmails";
import Stripe from "stripe";
import { stripeCustomerIdFromCharge } from "../stripeSessionInfo";
import nameParser from "another-name-parser";
import dollars from "../dollars";
import requireEnv from "../requireEnv";
import getStripe from "../getStripe";
import { OAuthToken } from "./OAuthToken";
import { soql } from "./soql";
import { expandState } from "./expandState";
export { OAuthToken, soql, expandState };

export type JSONRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export interface SalesforceClient {
  readonly token: OAuthToken;
  readonly apiVersion: string;
  readonly req: (path: string, options?: JSONRequestInit) => Promise<Response>;
  readonly recordTypeIds: {
    readonly Donation: string;
    readonly Matching_Gift: string;
    readonly Special_Event_Revenue: string;
    readonly General: string;
    readonly Default: string;
  };
}

export interface SObjectResponse {
  readonly id: string;
  readonly success: boolean;
  readonly errors: readonly string[];
}

export interface SObjectClient<SObject extends keyof Schema> {
  readonly client: SalesforceClient;
  readonly sObject: SObject;
  readonly create: (
    body: Omit<Schema[SObject], "Id">,
  ) => Promise<SObjectResponse>;
  readonly update: (
    id: string,
    body: Partial<Omit<Schema[SObject], "Id">>,
  ) => Promise<void>;
  readonly get: (id: string) => Promise<Schema[SObject]>;
  readonly getFields: <K extends keyof Schema[SObject]>(
    id: string,
    fields: readonly K[],
  ) => Promise<Pick<Schema[SObject], K> | null>;
}

export type SQueryResult<T> =
  | {
      done: true;
      totalSize: number;
      records: T[];
    }
  | {
      done: false;
      nextRecordsUrl: string;
      totalSize: number;
      records: T[];
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sQuery<T extends Record<never, never> = any>(
  client: SalesforceClient,
  query: string,
): Promise<SQueryResult<T>> {
  const prefix = `/services/data/${client.apiVersion}/query/?q=`;
  return client.req(prefix + encodeURIComponent(query)).then(async (res) => {
    if (!res.ok) {
      throw new Error(
        `Failed query: ${JSON.stringify(await res.json(), null, 2)}`,
      );
    }
    return res.json();
  });
}

export function sObject<SObject extends keyof Schema>(
  client: SalesforceClient,
  sObject: SObject,
): SObjectClient<SObject> {
  const prefix = `/services/data/${client.apiVersion}/sobjects/${sObject}`;
  return {
    client,
    sObject,
    create: (body) =>
      client.req(prefix, { method: "POST", body }).then(async (res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to create ${sObject}: ${await res.text()}\n${JSON.stringify(
              body,
              null,
              2,
            )}`,
          );
        }
        return res.json();
      }),
    update: (id, body) =>
      client.req(`${prefix}/${id}`, { method: "PATCH", body }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to update ${sObject} ${id}`);
        }
      }),
    get: (id) => client.req(`${prefix}/${id}`).then((req) => req.json()),
    getFields: (id, fields) =>
      client
        .req(`${prefix}/${id}?fields=${fields.join(",")}`)
        .then((req) => (req.status === 404 ? null : req.json())),
  } as const;
}

export const client = ({
  token,
  apiVersion,
  recordTypeIds,
}: Omit<SalesforceClient, "req">): SalesforceClient => {
  const req = async (
    path: string,
    options?: JSONRequestInit,
  ): Promise<Response> =>
    fetch(`${token.instance_url}${path}`, {
      ...options,
      body: options?.body ? JSON.stringify(options.body) : null,
      headers: {
        Accept: "application/json",
        ...options?.headers,
        Authorization: `Bearer ${token.access_token}`,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  return { token, apiVersion, req, recordTypeIds } as const;
};

export async function login(): Promise<SalesforceClient> {
  const apiVersion = "v61.0";
  const instanceUrl: string = requireEnv("SALESFORCE_INSTANCE_URL");
  const url = `${instanceUrl}/services/oauth2/token`;
  const body = new URLSearchParams(
    Object.entries({
      grant_type: "client_credentials",
      client_id: requireEnv("SALESFORCE_CLIENT_ID"),
      client_secret: requireEnv("SALESFORCE_CLIENT_SECRET"),
    }),
  ).toString();
  const recordTypeIds: SalesforceClient["recordTypeIds"] = {
    Donation: requireEnv("SALESFORCE_RECORD_TYPE_ID_DONATION"),
    Matching_Gift: requireEnv("SALESFORCE_RECORD_TYPE_ID_MATCHING_GIFT"),
    Special_Event_Revenue: requireEnv(
      "SALESFORCE_RECORD_TYPE_ID_SPECIAL_EVENT_REVENUE",
    ),
    General: requireEnv("SALESFORCE_RECORD_TYPE_ID_GENERAL"),
    Default: requireEnv("SALESFORCE_RECORD_TYPE_ID_DEFAULT"),
  };
  const res = await fetch(url, {
    body,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Failed to login: ${res.status} ${res.statusText} ${JSON.stringify(
        data,
        null,
        2,
      )}`,
    );
  }
  return client({
    token: await S.decodeUnknownPromise(OAuthToken)(data),
    recordTypeIds,
    apiVersion,
  });
}

export interface Schema {
  campaign: Campaign;
  contact: Contact;
  opportunity: Opportunity;
  npe03__Recurring_Donation__c: RecurringDonation;
}

export interface Contact {
  Id: string;
  RecordTypeId?: string; // "SALESFORCE_RECORD_TYPE_ID_GENERAL"
  AccountId?: string;
  Stripe_Customer_ID__c?: string;
  Givebutter_Contact_ID__c?: string;
  Email?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName: string;
  Description?: string;
  Suffix?: string;
  Donor__c?: boolean;
  Preferred_Name_Nickname__c?: string;
  Phone?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountryCode?: string;
  MailingStreet?: string;
}

export interface Opportunity {
  Id: string;
  RecordTypeId: string; // "SALESFORCE_RECORD_TYPE_ID_DONATION" | "SALESFORCE_RECORD_TYPE_ID_MATCHING_GIFT" | "SALESFORCE_RECORD_TYPE_ID_SPECIAL_EVENT_REVENUE"
  Name: string; // "Donation #$donationId"
  ContactId: Contact["Id"];
  CampaignId: Campaign["Id"] | null;
  Amount: number;
  AccountId: NonNullable<Contact["AccountId"]>;
  CloseDate: string; // "2021-01-01"
  StageName: string; // "Closed Won"
  npe03__Recurring_Donation__c?: string;
  Stripe_Charge_ID__c?: string;
  Transaction_ID__c?: string;
  Form_of_Payment__c?: string;
  Payment_Fees__c?: number;
  Givebutter_Transaction_ID__c?: string;
}

export interface Campaign {
  Id: string;
  Name: string;
  Type: string; // "Event" | "Fundraising"
  RecordTypeId: string; // "SALESFORCE_RECORD_TYPE_ID_DEFAULT"
  Description: string | null;
  Status: string; // "Planned"
  StartDate: string | null;
  EndDate: string | null;
  Givebutter_Campaign_ID__c: string | null;
}

export interface RecurringDonation {
  Id: string;
  Name: string;
  npe03__Contact__c: Contact["Id"];
  npe03__Amount__c: number;
  npe03__Installment_Period__c:
    | "Monthly"
    | "Yearly"
    | (string & Record<never, never>);
  npsp__InstallmentFrequency__c: number;
  npsp__EndDate__c: string | null;
  npsp__Status__c:
    | "Active"
    | "Lapsed"
    | "Closed"
    | "Paused"
    | "Failing"
    | (string & Record<never, never>);
  npsp__Day_of_Month__c: string;
  npe03__Date_Established__c: string;
  Stripe_Subscription_ID__c?: string;
  Givebutter_Plan_ID__c?: string;
}
export const RecurringDonationFields = [
  "Id",
  "Name",
  "npe03__Contact__c",
  "npe03__Amount__c",
  "npe03__Installment_Period__c",
  "npsp__InstallmentFrequency__c",
  "npsp__EndDate__c",
  "npsp__Status__c",
  "npsp__Day_of_Month__c",
  "npe03__Date_Established__c",
  "Stripe_Subscription_ID__c",
  "Givebutter_Plan_ID__c",
] as const satisfies (keyof RecurringDonation)[];

export type ContactSearchResult = Pick<
  Contact,
  | "Id"
  | "AccountId"
  | "Stripe_Customer_ID__c"
  | "Givebutter_Contact_ID__c"
  | "Email"
  | "FirstName"
  | "LastName"
  | "Phone"
  | "Donor__c"
>;

export interface ContactResult {
  ContactId: Contact["Id"];
  AccountId: NonNullable<Contact["AccountId"]>;
}

const metadataName = (
  metadata: Stripe.Charge["metadata"],
): ReturnType<typeof nameParser> | null =>
  metadata.user_first_name && metadata.user_last_name
    ? {
        first: metadata.user_first_name,
        last: metadata.user_last_name,
        middle: null,
        suffix: null,
        prefix: null,
        original: `${metadata.user_first_name} ${metadata.user_last_name}`,
      }
    : null;

export async function createOrFetchContactFromCharge(
  client: SalesforceClient,
  charge: Stripe.Charge,
): Promise<ContactResult> {
  const stripeCustomerId = stripeCustomerIdFromCharge(charge);
  const email =
    charge.metadata.Email ??
    charge.metadata.email ??
    charge.metadata.user_email ??
    charge.billing_details.email;
  if (!email) {
    throw new Error(
      `Expecting non-null email for charge ${charge.id}\n${JSON.stringify(
        charge,
        null,
        2,
      )}`,
    );
  }
  const parsedName =
    metadataName(charge.metadata) ??
    nameParser(charge.billing_details.name ?? email.split("@")[0]);
  const phone = charge.billing_details.phone;
  const clauses = [
    soql`Stripe_Customer_ID__c = ${stripeCustomerId}`,
    soql`Email = ${email}`,
    parsedName.last && parsedName.first
      ? soql`(FirstName LIKE ${parsedName.first + "%"} AND LastName = ${
          parsedName.last
        })`
      : soql`Name = ${parsedName.original}`,
    ...(phone ? [soql`Phone = ${phone}`] : []),
  ];
  const { records } = await sQuery<ContactSearchResult>(
    client,
    `SELECT Id, AccountId, Stripe_Customer_ID__c, Givebutter_Contact_ID__c, Email, Phone, FirstName, LastName, Donor__c FROM Contact WHERE ${clauses.join(
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
      } else if (record.Stripe_Customer_ID__c === stripeCustomerId) {
        return 3;
      } else if (record.Email === email) {
        return 2;
      } else if (record.Phone === phone) {
        return 1;
      }
      return 0;
    }
    // First record with Stripe customer match, else prefer Email to name match.
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
    if (!existingContact.Stripe_Customer_ID__c || !existingContact.Donor__c) {
      await sObject(client, "contact").update(contactId, {
        Stripe_Customer_ID__c: stripeCustomerId,
        Donor__c: true,
      });
    }
    if (!existingContact.AccountId) {
      throw new Error(`Expecting AccountId for existing contact ${contactId}`);
    }
    console.log(
      `Found existing contact ${contactId} account ${existingContact.AccountId} for Customer ${stripeCustomerId}`,
    );
    return { ContactId: contactId, AccountId: existingContact.AccountId };
  } else {
    const { address } = charge.billing_details;
    const contactApi = sObject(client, "contact");
    const res = await contactApi.create({
      ...nameFields(),
      ...Object.fromEntries(
        [
          ["Phone", phone],
          ["Preferred_Name_Nickname__c", charge.billing_details.name],
          ["MailingCity", address?.city],
          ["MailingState", expandState(address?.state)],
          ["MailingCountryCode", charge.metadata.country ?? address?.country],
          [
            "MailingPostalCode",
            charge.metadata.postal_code ??
              charge.metadata.zip_code ??
              address?.postal_code,
          ],
          [
            "MailingStreet",
            [address?.line1, address?.line2].filter(Boolean).join("\n"),
          ],
        ].flatMap(([k, v]) => (v ? [[k, v]] : [])),
      ),
      Email: email,
      Stripe_Customer_ID__c: stripeCustomerId,
      Donor__c: true,
      RecordTypeId: client.recordTypeIds.General,
    });
    const fields = await contactApi.getFields(res.id, ["Id", "AccountId"]);
    const AccountId = fields?.AccountId;
    if (!AccountId) {
      throw new Error(`Expecting AccountId for new contact ${res.id}`);
    }
    console.log(`Created contact ${res.id} for Customer ${stripeCustomerId}`);
    return { ContactId: res.id, AccountId };
  }
}

function getBalanceTransactionId(charge: Stripe.Charge): string {
  if (!charge.balance_transaction) {
    throw new Error(
      `Expecting non-null balance_transaction for charge ${charge.id}`,
    );
  }
  return typeof charge.balance_transaction === "string"
    ? charge.balance_transaction
    : charge.balance_transaction.id;
}

function stageForStatus(chargeStatus: string): Opportunity["StageName"] {
  switch (chargeStatus) {
    case "pending":
      return "Posted";
    case "succeeded":
      return "Posted - Fully Paid";
    case "failed":
      return "Lost";
    default:
      return "Ask Made";
  }
}

function unixToISODate(unix: number): string {
  return new Date(unix * 1000).toISOString().split("T")[0];
}

export async function createOrFetchOpportunityFromCharge(
  client: SalesforceClient,
  charge: Stripe.Charge,
  subscription?: Stripe.Subscription,
): Promise<void> {
  const opportunityApi = sObject(client, "opportunity");
  const extraNameInfo = charge.metadata?.anonymous ? " (Anonymous)" : "";
  const balanceTransaction = await getStripe().balanceTransactions.retrieve(
    getBalanceTransactionId(charge),
  );
  const closeDate = unixToISODate(balanceTransaction.created);
  const stageName = stageForStatus(charge.status);
  const opportunityName = `${
    charge.billing_details.name
  }${extraNameInfo} ${dollars(charge.amount)} ${
    subscription ? "Recurring " : ""
  } Donation ${closeDate}`;
  const existing = await opportunityApi.getFields(
    `Stripe_Charge_ID__c/${charge.id}`,
    ["Id", "Name", "StageName"],
  );
  if (existing) {
    console.log(
      `Existing Opportunity record found ${existing.Id} for charge ${charge.id}`,
    );
    if (existing.Name !== opportunityName || existing.StageName !== stageName) {
      console.log(
        `Updating StageName and Name for Opportunity ${existing.Id} ${stageName} ${opportunityName}`,
      );
      await opportunityApi.update(existing.Id, {
        Name: opportunityName,
        StageName: stageName,
      });
    }
    return;
  }
  const { AccountId, ContactId } = await createOrFetchContactFromCharge(
    client,
    charge,
  );
  const getRecurringDetails = async () => {
    if (!subscription || subscription.items.data.length !== 1) {
      return {};
    }
    const [item] = subscription.items.data;
    if (item.plan.interval !== "month" || item.plan.interval_count !== 1) {
      return {};
    }
    const recurringApi = sObject(client, "npe03__Recurring_Donation__c");
    const existing = await recurringApi.getFields(
      `Stripe_Subscription_ID__c/${subscription.id}`,
      ["Id"],
    );
    if (existing) {
      console.log(
        `Found existing Recurring Donation ${existing.Id} for subscription ${subscription.id}`,
      );
      return { npe03__Recurring_Donation__c: existing.Id };
    }
    const monthlyAmount = (item.plan.amount ?? 0) * (item.quantity ?? 1);
    const established = unixToISODate(subscription.created);
    const res = await recurringApi.create({
      Name: `Subscription ${dollars(monthlyAmount)}/mo ${
        subscription.id
      }${extraNameInfo}`,
      Stripe_Subscription_ID__c: subscription.id,
      npe03__Contact__c: ContactId,
      npe03__Amount__c: monthlyAmount / 100,
      npe03__Installment_Period__c: "Monthly",
      npsp__Status__c: "Active",
      npsp__Day_of_Month__c: established.match(/^\d+-0?(\d+)-/)?.[1] ?? "1",
      npe03__Date_Established__c: established,
      npsp__InstallmentFrequency__c: 1,
      npsp__EndDate__c: null,
    });
    console.log(
      `Created Recurring Donation ${res.id} for subscription ${subscription.id}`,
    );
    return { npe03__Recurring_Donation__c: res.id };
  };
  const res = await opportunityApi.create({
    ...(await getRecurringDetails()),
    AccountId,
    ContactId,
    RecordTypeId: client.recordTypeIds.Donation,
    StageName: stageName,
    Name: opportunityName,
    Amount: charge.amount / 100,
    Payment_Fees__c: balanceTransaction.fee / 100,
    CloseDate: new Date(charge.created * 1000).toISOString(),
    Stripe_Charge_ID__c: charge.id,
    Form_of_Payment__c: "Stripe",
    CampaignId: null,
  });
  console.log(`Created Opportunity ${res.id} for Charge ${charge.id}`);
}

export async function stripeCheckoutSessionCompletedPaymentSync(
  client: SalesforceClient,
  sessionId: string,
): Promise<void> {
  const payment_intent = await fetchSessionPaymentIntent(sessionId);
  const charge = payment_intent.latest_charge;
  if (!charge || typeof charge !== "object") {
    throw new Error(
      `Expecting expanded latest_charge ${JSON.stringify(charge)}`,
    );
  }
  await createOrFetchOpportunityFromCharge(client, charge);
}

export async function stripeChargeSync(
  client: SalesforceClient,
  chargeId: string,
): Promise<void> {
  const charge = await getStripe().charges.retrieve(chargeId);
  await createOrFetchOpportunityFromCharge(client, charge);
}

export async function stripeInvoicePaymentSync(
  client: SalesforceClient,
  invoiceId: string,
): Promise<void> {
  const invoice = await fetchInvoiceWithPaymentIntent(invoiceId);
  const template = invoiceTemplate(invoice);
  if (template === null) {
    return;
  }
  const charge = invoice.payment_intent.latest_charge;
  if (!charge || typeof charge !== "object") {
    throw new Error(
      `Expecting expanded latest_charge ${JSON.stringify(charge)}`,
    );
  }
  // TODO: Projection of recurring donations is disabled until we
  //       can do further investigation of the model and add hooks
  //       for full subscription management.
  await createOrFetchOpportunityFromCharge(
    client,
    charge,
    // invoice.subscription
  );
}
