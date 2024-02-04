import { Effect } from "effect";
import * as S from "@effect/schema/Schema";
import { describe, expect, it } from "vitest";
import { GetContactsResponse } from "./contact";

const EXAMPLE_CONTACTS_RESPONSE: S.Schema.To<typeof GetContactsResponse> = {
  data: [
    // Example contacts censored for privacy
    {
      id: 6830532,
      prefix: null,
      first_name: "Brooke",
      middle_name: null,
      last_name: "Richards",
      suffix: null,
      gender: null,
      dob: null,
      company: null,
      title: null,
      website_url: null,
      twitter_url: null,
      linkedin_url: null,
      facebook_url: null,
      emails: [
        {
          type: "personal",
          value: "arichards@missionbit.org",
        },
      ],
      phones: [],
      primary_email: "arichards@missionbit.org",
      primary_phone: null,
      note: null,
      addresses: [],
      primary_address: null,
      stats: {
        total_contributions: 0,
        recurring_contributions: 0,
      },
      tags: [],
      custom_fields: [],
      external_ids: [],
      is_email_subscribed: false,
      is_phone_subscribed: false,
      is_address_subscribed: true,
      archived_at: null,
      created_at: "2023-11-18T04:31:33+00:00",
      updated_at: "2023-11-18T04:31:33+00:00",
    },
  ],
  links: {
    first: "https://api.givebutter.com/v1/contacts?page=1",
    last: "https://api.givebutter.com/v1/contacts?page=2",
    prev: null,
    next: "https://api.givebutter.com/v1/contacts?page=2",
  },
  meta: {
    current_page: 1,
    from: 1,
    last_page: 2,
    links: [
      {
        url: null,
        label: "&laquo; Previous",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/contacts?page=1",
        label: "1",
        active: true,
      },
      {
        url: "https://api.givebutter.com/v1/contacts?page=2",
        label: "2",
        active: false,
      },
      {
        url: "https://api.givebutter.com/v1/contacts?page=2",
        label: "Next &raquo;",
        active: false,
      },
    ],
    path: "https://api.givebutter.com/v1/contacts",
    per_page: 20,
    to: 20,
    total: 37,
  },
};

describe("GetContactsResponse", () => {
  it("parses EXAMPLE_CONTACTS_RESPONSE", async () => {
    expect(
      await Effect.runPromise(
        S.parse(GetContactsResponse)(EXAMPLE_CONTACTS_RESPONSE),
      ),
    ).toEqual(EXAMPLE_CONTACTS_RESPONSE);
  });
});
