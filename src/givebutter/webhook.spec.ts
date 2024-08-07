import { Effect } from "effect";
import * as S from "@effect/schema/Schema";
import { describe, expect, it } from "vitest";
import { Webhook } from "./webhook";
describe("Webhook parse", () => {
  it("should parse contact.created", async () => {
    const webhook = {
      event: "contact.created",
      id: "e696abf3-e959-4732-bf70-82b5d6e8889d",
      data: {
        id: 8800730,
        dob: null,
        note: null,
        tags: [],
        stats: {
          total_contributions: 1000,
          recurring_contributions: 0,
        },
        title: null,
        emails: [
          {
            type: "personal",
            value: "bob@example.com",
          },
        ],
        gender: null,
        phones: [
          {
            type: "home",
            value: "+14155551212",
          },
        ],
        prefix: null,
        suffix: null,
        company: null,
        addresses: [
          {
            city: "Covina",
            type: "home",
            state: "CA",
            country: "USA",
            zipcode: "91723",
            address_1: "123 Main St",
            address_2: "#5432",
            created_at: "2024-02-03T20:49:28.000000Z",
            is_primary: true,
            updated_at: "2024-02-03T20:49:29.000000Z",
          },
        ],
        last_name: "Ippolito",
        created_at: "2024-02-03T20:49:28+00:00",
        first_name: "Bob",
        updated_at: "2024-02-03T20:49:28+00:00",
        archived_at: null,
        middle_name: null,
        twitter_url: null,
        website_url: null,
        external_ids: [],
        facebook_url: null,
        linkedin_url: null,
        custom_fields: [],
        primary_email: "bob@example.com",
        primary_phone: "+14155551212",
        primary_address: {
          city: "Covina",
          type: "home",
          state: "CA",
          country: "USA",
          zipcode: "91723",
          address_1: "123 Main St",
          address_2: "#5432",
          created_at: "2024-02-03T20:49:28.000000Z",
          is_primary: true,
          updated_at: "2024-02-03T20:49:29.000000Z",
        },
        is_email_subscribed: true,
        is_phone_subscribed: true,
        is_address_subscribed: true,
      },
    };
    expect(await Effect.runPromise(S.decodeUnknown(Webhook)(webhook))).toEqual(
      webhook,
    );
  });
  it("should parse transaction.succeeded", async () => {
    const webhook = {
      id: "ca5fbf41-31cf-4227-b511-7897c334ae59",
      data: {
        id: "QiN7blzUhiwXBVBr",
        // added 2024-07-02
        contact_id: 1234,
        number: 1234,
        // end added 2024-07-02
        fee: 0.61,
        email: "bob@example.com",
        phone: "+14155551212",
        amount: 10,
        method: "card",
        payout: 10,
        status: "succeeded",
        address: {
          city: "Covina",
          state: "CA",
          country: "USA",
          zipcode: "91723",
          address_1: "123 Main St",
          address_2: "#5432",
        },
        company: null,
        donated: 10,
        fund_id: null,
        plan_id: "3Hz6wSJzWYx72Mth",
        team_id: null,
        currency: "USD",
        fund_code: null,
        last_name: "Ippolito",
        member_id: null,
        created_at: "2024-02-03T20:49:24+00:00",
        dedication: null,
        first_name: "Bob",
        session_id: "6bc9722a-b62b-4d92-b79c-3fb1f1249609",
        campaign_id: 172264,
        external_id: null,
        fee_covered: 0.61,
        giving_space: {
          id: 3985243,
          name: "Bob Ippolito",
          amount: 10,
          message: "Webhook test!",
        },
        transactions: [
          {
            id: "2277824212",
            fee: 0.61,
            amount: 10,
            payout: 10,
            donated: 10,
            plan_id: "3Hz6wSJzWYx72Mth",
            captured: true,
            refunded: false,
            line_items: [
              {
                type: "donation",
                price: 10,
                total: 10,
                subtype: "donation",
                discount: 0,
                quantity: 1,
                description: "Donation to Mission Bit",
              },
              {
                type: "donation",
                price: 0.61,
                total: 0.61,
                subtype: "fee",
                discount: 0,
                quantity: 1,
                description: "Processing fee",
              },
            ],
            captured_at: "2024-02-03T20:49:26+00:00",
            fee_covered: 0.61,
            refunded_at: null,
          },
        ],
        campaign_code: "7NQKTF",
        custom_fields: [],
        transacted_at: "2024-02-03T20:49:24+00:00",
        payment_method: "card",
        utm_parameters: [],
        communication_opt_in: true,
      },
      event: "transaction.succeeded",
    };
    expect(await Effect.runPromise(S.decodeUnknown(Webhook)(webhook))).toEqual(
      webhook,
    );
  });
});
