import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";
import { BaseAddress } from "./contact";

export const GivingSpace = S.struct({
  id: S.number,
  name: S.string,
  amount: S.number,
  message: S.nullable(S.string),
});

export const LineItemDonation = S.struct({
  type: S.literal("donation"),
  subtype: S.literal("donation", "fee"),
  description: S.string,
  quantity: S.number,
  price: S.number,
  discount: S.number,
  total: S.number,
});

export const LineItemTicket = S.struct({
  type: S.literal("item"),
  subtype: S.literal("ticket"),
  description: S.string,
  quantity: S.number,
  price: S.number,
  discount: S.number,
  total: S.number,
});

export const LineItem = S.union(LineItemDonation, LineItemTicket);

export const SubTransaction = S.struct({
  id: S.string,
  plan_id: S.nullable(S.string),
  amount: S.number,
  fee: S.number,
  fee_covered: S.number,
  donated: S.number,
  payout: S.number,
  captured: S.boolean,
  captured_at: S.nullable(S.string),
  refunded: S.boolean,
  line_items: S.array(LineItem),
});

export const Transaction = S.struct({
  id: S.string,
  campaign_id: S.number,
  campaign_code: S.string,
  plan_id: S.nullable(S.string),
  team_id: S.nullable(S.string),
  member_id: S.nullable(S.string),
  fund_id: S.nullable(S.string),
  fund_code: S.nullable(S.string),
  first_name: S.string,
  last_name: S.string,
  company: S.nullable(S.string),
  email: S.string,
  phone: S.nullable(S.string),
  address: S.nullable(BaseAddress),
  status: S.literal("succeeded", "authorized", "failed", "cancelled"),
  method: S.union(
    S.literal(
      "card",
      "paypal",
      "venmo",
      "check",
      "cash",
      "ach",
      "terminal",
      "none",
    ),
    S.string,
  ),
  // Presumably a legacy field
  payment_method: S.optional(S.unknown),
  amount: S.number,
  fee: S.number,
  fee_covered: S.number,
  donated: S.number,
  payout: S.number,
  currency: S.literal("USD"),
  transacted_at: S.string,
  created_at: S.string,
  giving_space: GivingSpace,
  dedication: S.nullable(S.string),
  transactions: S.array(SubTransaction),
  custom_fields: S.array(S.unknown),
  utm_parameters: S.record(
    S.union(
      S.literal(
        "referer",
        "utm_term",
        "utm_medium",
        "utm_source",
        "utm_content",
        "utm_campaign",
      ),
      S.string,
    ),
    S.string,
  ).pipe(S.partial, S.nullable),
  external_id: S.optional(S.nullable(S.unknown)),
  communication_opt_in: S.boolean,
  session_id: S.nullable(S.string),
  check_number: S.optional(S.nullable(S.unknown)),
  check_deposited_at: S.optional(S.nullable(S.string)),
});

export const GetTransactionsResponse = PaginatedResponse(Transaction);

export function getTransactionsUrl(
  scope: "all" | "benefiting" | "chapters" | null,
) {
  const prefix = "https://api.givebutter.com/v1/transactions";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Transaction] as const;
}

export const EXAMPLE_TRANSACTIONS_RESPONSE: S.Schema.To<
  typeof GetTransactionsResponse
> = {
  data: [
    {
      id: "3TXgFlbLgr8Xin3f",
      campaign_id: 173909,
      campaign_code: "JMTJNI",
      plan_id: "VV2WktbU5v9bkzIH",
      team_id: null,
      member_id: null,
      fund_id: null,
      fund_code: null,
      first_name: "Robert",
      last_name: "Ippolito",
      company: null,
      email: "bob@example.com",
      phone: "+14155551212",
      address: {
        address_1: "Address",
        address_2: null,
        city: "Covina",
        state: "CA",
        country: "USA",
        zipcode: "91723",
      },
      status: "succeeded",
      payment_method: "paypal",
      method: "paypal",
      amount: 10,
      fee: 0.61,
      fee_covered: 0.61,
      donated: 10,
      payout: 10,
      currency: "USD",
      transacted_at: "2023-11-24T18:30:42+00:00",
      created_at: "2023-11-24T18:30:42+00:00",
      giving_space: {
        id: 3527626,
        name: "Robert Ippolito",
        amount: 10,
        message: null,
      },
      dedication: null,
      transactions: [
        {
          id: "5909826560",
          plan_id: "VV2WktbU5v9bkzIH",
          amount: 10,
          fee: 0.61,
          fee_covered: 0.61,
          donated: 10,
          payout: 10,
          captured: true,
          captured_at: "2023-11-24T18:30:46+00:00",
          refunded: false,
          line_items: [
            {
              type: "donation",
              subtype: "donation",
              description: "Donation to Mission Bit",
              quantity: 1,
              price: 10,
              discount: 0,
              total: 10,
            },
            {
              type: "donation",
              subtype: "fee",
              description: "Processing fee",
              quantity: 1,
              price: 0.61,
              discount: 0,
              total: 0.61,
            },
          ],
        },
      ],
      custom_fields: [],
      utm_parameters: null,
      external_id: null,
      communication_opt_in: true,
      session_id: "b67fdc12-c084-4e13-a3ee-aff94cb6484c",
    },
    {
      id: "sM6hfCIJujAm7ckC",
      campaign_id: 172267,
      campaign_code: "ASUIS2",
      plan_id: null,
      team_id: null,
      member_id: null,
      fund_id: null,
      fund_code: null,
      first_name: "Example",
      last_name: "Smith",
      company: null,
      email: "example@example.com",
      phone: null,
      address: {
        address_1: null,
        address_2: null,
        city: null,
        state: null,
        country: null,
        zipcode: null,
      },
      status: "succeeded",
      payment_method: "none",
      method: "none",
      amount: 0,
      fee: 0,
      fee_covered: 0,
      donated: 0,
      payout: 0,
      currency: "USD",
      transacted_at: "2023-11-22T01:11:36+00:00",
      created_at: "2023-11-22T01:11:36+00:00",
      giving_space: {
        id: 3518215,
        name: "Anonymous",
        amount: 0,
        message: null,
      },
      dedication: null,
      transactions: [
        {
          id: "4409225633",
          plan_id: null,
          amount: 0,
          fee: 0,
          fee_covered: 0,
          donated: 0,
          payout: 0,
          captured: true,
          captured_at: "2023-11-22T01:11:36+00:00",
          refunded: false,
          line_items: [
            {
              type: "item",
              subtype: "ticket",
              description:
                "MBFA23 Demo Day General Admission (MBVIP23 - 100.00% OFF)",
              quantity: 1,
              price: 25,
              discount: 25,
              total: 0,
            },
          ],
        },
      ],
      custom_fields: [],
      utm_parameters: {
        referer: "https://missionbit.org/",
      },
      external_id: null,
      communication_opt_in: true,
      session_id: "9be9e299-32a2-41d3-9ece-a7d2e184782c",
    },
    {
      id: "XysRljAdtCOo8OU1",
      campaign_id: 178137,
      campaign_code: "7EJRGQ",
      plan_id: null,
      team_id: null,
      member_id: null,
      fund_id: null,
      fund_code: null,
      first_name: "Example",
      last_name: "Person",
      company: null,
      email: "example@example.com",
      phone: null,
      address: {
        address_1: "Address",
        address_2: null,
        city: "Fremont",
        state: "CA",
        country: "USA",
        zipcode: "94536",
      },
      status: "succeeded",
      payment_method: "card",
      method: "card",
      amount: 1,
      fee: 0.34,
      fee_covered: 0.34,
      donated: 1,
      payout: 1,
      currency: "USD",
      transacted_at: "2023-11-21T23:51:36+00:00",
      created_at: "2023-11-21T23:51:36+00:00",
      giving_space: {
        id: 3517628,
        name: "Anonymous",
        amount: 0,
        message: null,
      },
      dedication: null,
      transactions: [
        {
          id: "9879853627",
          plan_id: null,
          amount: 1,
          fee: 0.34,
          fee_covered: 0.34,
          donated: 1,
          payout: 1,
          captured: true,
          captured_at: "2023-11-21T23:51:37+00:00",
          refunded: false,
          line_items: [
            {
              type: "donation",
              subtype: "donation",
              description: "Donation to Mission Bit",
              quantity: 1,
              price: 1,
              discount: 0,
              total: 1,
            },
            {
              type: "donation",
              subtype: "fee",
              description: "Processing fee",
              quantity: 1,
              price: 0.34,
              discount: 0,
              total: 0.34,
            },
          ],
        },
      ],
      custom_fields: [],
      utm_parameters: {
        utm_term: "0_-7e8088d95a-[LIST_EMAIL_ID]",
        utm_medium: "email",
        utm_source: "newsletter",
        utm_content: "week_before",
        utm_campaign: "Giving_Tuesday",
      },
      external_id: null,
      communication_opt_in: false,
      session_id: "244dcaeb-2cc2-49ca-8103-ae985c33c228",
    },
    {
      id: "9kx70YxDviRfFmV2",
      campaign_id: 172267,
      campaign_code: "ASUIS2",
      plan_id: null,
      team_id: null,
      member_id: null,
      fund_id: null,
      fund_code: null,
      first_name: "Example",
      last_name: "Persona",
      company: null,
      email: "example@example.org",
      phone: null,
      address: {
        address_1: null,
        address_2: null,
        city: null,
        state: null,
        country: null,
        zipcode: null,
      },
      status: "succeeded",
      payment_method: "none",
      method: "none",
      amount: 0,
      fee: 0,
      fee_covered: 0,
      donated: 0,
      payout: 0,
      currency: "USD",
      transacted_at: "2023-11-21T21:46:12+00:00",
      created_at: "2023-11-21T21:46:12+00:00",
      giving_space: {
        id: 3516803,
        name: "Anonymous",
        amount: 0,
        message: null,
      },
      dedication: null,
      transactions: [
        {
          id: "7068627952",
          plan_id: null,
          amount: 0,
          fee: 0,
          fee_covered: 0,
          donated: 0,
          payout: 0,
          captured: true,
          captured_at: "2023-11-21T21:46:12+00:00",
          refunded: false,
          line_items: [
            {
              type: "item",
              subtype: "ticket",
              description:
                "MBFA23 Demo Day General Admission (MBVIP23 - 100.00% OFF)",
              quantity: 1,
              price: 25,
              discount: 25,
              total: 0,
            },
          ],
        },
      ],
      custom_fields: [],
      utm_parameters: null,
      external_id: null,
      communication_opt_in: false,
      session_id: "eaa4bb65-aac0-4ec1-b166-f5325597b726",
    },
    {
      id: "hD0G2jBhuVpUVJwg",
      campaign_id: 172267,
      campaign_code: "ASUIS2",
      plan_id: null,
      team_id: null,
      member_id: null,
      fund_id: null,
      fund_code: null,
      first_name: "GA",
      last_name: "Person",
      company: null,
      email: "ga@example.com",
      phone: "+14155551212",
      address: {
        address_1: null,
        address_2: null,
        city: null,
        state: null,
        country: null,
        zipcode: null,
      },
      status: "succeeded",
      payment_method: "paypal",
      method: "paypal",
      amount: 50,
      fee: 1.8,
      fee_covered: 1.8,
      donated: 50,
      payout: 50,
      currency: "USD",
      transacted_at: "2023-11-21T15:18:09+00:00",
      created_at: "2023-11-21T15:18:09+00:00",
      giving_space: {
        id: 3514146,
        name: "Noel Ortiz",
        amount: 50,
        message: null,
      },
      dedication: null,
      transactions: [
        {
          id: "5007437922",
          plan_id: null,
          amount: 50,
          fee: 1.8,
          fee_covered: 1.8,
          donated: 50,
          payout: 50,
          captured: true,
          captured_at: "2023-11-21T15:18:11+00:00",
          refunded: false,
          line_items: [
            {
              type: "item",
              subtype: "ticket",
              description: "General Admission",
              quantity: 2,
              price: 25,
              discount: 0,
              total: 50,
            },
            {
              type: "donation",
              subtype: "fee",
              description: "Processing fee",
              quantity: 1,
              price: 1.8,
              discount: 0,
              total: 1.8,
            },
          ],
        },
      ],
      custom_fields: [],
      utm_parameters: null,
      external_id: null,
      communication_opt_in: true,
      session_id: "988d297c-eb8f-4203-a3b1-75047512ddcc",
    },
  ],
  links: {
    first: "https://api.givebutter.com/v1/transactions?page=1",
    last: "https://api.givebutter.com/v1/transactions?page=1",
    prev: null,
    next: null,
  },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 1,
    links: [
      {
        url: null,
        label: "&laquo; Previous",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/transactions?page=1",
        label: "1",
        active: true,
      },
      {
        url: null,
        label: "Next &raquo;",
        active: false,
      },
    ],
    path: "https://api.givebutter.com/v1/transactions",
    per_page: 20,
    to: 16,
    total: 16,
    unfiltered_total: 16,
  },
};