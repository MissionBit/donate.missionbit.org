import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";
import { pipe } from "effect";

export const Phone = S.struct({
  type: S.literal("work", "home", "cell"),
  value: S.string,
});

export const Email = S.struct({
  type: S.literal("personal", "work"),
  value: S.string,
});

export const BaseAddress = S.struct({
  address_1: S.nullable(S.string),
  address_2: S.nullable(S.string),
  city: S.nullable(S.string),
  state: S.nullable(S.string),
  zipcode: S.nullable(S.string),
  country: S.nullable(S.string),
});

export const Address = pipe(
  BaseAddress,
  S.extend(
    S.struct({
      type: S.literal("home", "work"),
      is_primary: S.boolean,
      created_at: S.string,
      updated_at: S.string,
    }),
  ),
);

export const Contact = S.struct({
  id: S.number,
  prefix: S.nullable(S.unknown),
  first_name: S.string,
  middle_name: S.nullable(S.string),
  last_name: S.string,
  suffix: S.nullable(S.unknown),
  gender: S.nullable(S.unknown),
  dob: S.nullable(S.string),
  company: S.nullable(S.string),
  title: S.nullable(S.string),
  website_url: S.nullable(S.string),
  twitter_url: S.nullable(S.string),
  linkedin_url: S.nullable(S.string),
  facebook_url: S.nullable(S.string),
  emails: S.array(Email),
  phones: S.array(Phone),
  primary_email: S.nullable(S.string),
  primary_phone: S.nullable(S.string),
  note: S.nullable(S.string),
  addresses: S.array(Address),
  primary_address: S.nullable(Address),
  stats: S.struct({
    total_contributions: S.number,
    recurring_contributions: S.number,
  }),
  tags: S.array(S.string),
  custom_fields: S.array(S.unknown),
  external_ids: S.array(S.unknown),
  archived_at: S.nullable(S.string),
  is_email_subscribed: S.boolean,
  is_phone_subscribed: S.boolean,
  is_address_subscribed: S.boolean,
  created_at: S.string,
  updated_at: S.string,
});

export const GetContactsResponse = PaginatedResponse(Contact);

export function getContactsUrl(scope: "active" | "all" | "archived" = "all") {
  return [
    `https://api.givebutter.com/v1/contacts?scope=${scope}`,
    Contact,
  ] as const;
}

export const EXAMPLE_CONTACTS_RESPONSE: S.Schema.To<
  typeof GetContactsResponse
> = {
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
