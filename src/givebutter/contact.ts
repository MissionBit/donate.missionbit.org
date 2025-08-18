import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";
import { pipe } from "effect";

export const Phone = S.Struct({
  type: S.Literal("work", "home", "cell"),
  value: S.String,
}).annotations({ identifier: "Phone" });

export const Email = S.Struct({
  type: S.Literal("personal", "work"),
  value: S.String,
}).annotations({ identifier: "Email" });

export const BaseAddress = S.Struct({
  address_1: S.NullishOr(S.String),
  address_2: S.NullishOr(S.String),
  city: S.NullishOr(S.String),
  state: S.NullishOr(S.String),
  zipcode: S.NullishOr(S.String),
  country: S.NullishOr(S.String),
}).annotations({ identifier: "BaseAddress" });

export const Address = pipe(
  BaseAddress,
  S.extend(
    S.Struct({
      type: S.Literal("home", "work"),
      is_primary: S.Boolean,
      created_at: S.String,
      updated_at: S.String,
    }),
  ),
).annotations({ identifier: "Address" });

export const Contact = S.Struct({
  id: S.Number,
  prefix: S.NullishOr(S.Unknown),
  first_name: S.String,
  middle_name: S.NullishOr(S.String),
  last_name: S.String,
  suffix: S.NullishOr(S.Unknown),
  gender: S.NullishOr(S.Unknown),
  dob: S.NullishOr(S.String),
  company: S.NullishOr(S.String),
  title: S.NullishOr(S.String),
  website_url: S.NullishOr(S.String),
  twitter_url: S.NullishOr(S.String),
  linkedin_url: S.NullishOr(S.String),
  facebook_url: S.NullishOr(S.String),
  emails: S.Array(Email),
  phones: S.Array(Phone),
  primary_email: S.NullishOr(S.String),
  primary_phone: S.NullishOr(S.String),
  note: S.NullishOr(S.String),
  addresses: S.Array(Address),
  primary_address: S.NullishOr(Address),
  stats: S.Struct({
    total_contributions: S.Number,
    recurring_contributions: S.Number,
  }).annotations({ identifier: "Stats" }),
  tags: S.Array(S.String),
  custom_fields: S.Array(S.Unknown),
  external_ids: S.Array(S.Unknown),
  archived_at: S.NullishOr(S.String),
  is_email_subscribed: S.Boolean,
  is_phone_subscribed: S.Boolean,
  is_address_subscribed: S.Boolean,
  created_at: S.String,
  updated_at: S.String,
  type: S.optional(S.Union(S.Literal("company"), S.String)),
  external_id: S.optional(S.NullishOr(S.Unknown)),
  employer: S.optional(S.NullishOr(S.String)),
  salutation_name: S.optional(S.NullishOr(S.String)),
  company_name: S.optional(S.NullishOr(S.String)),
  preferred_name: S.optional(S.NullishOr(S.String)),
  associated_companies: S.optional(S.NullishOr(S.Unknown)),
  address_unsubscribed_at: S.optional(S.NullishOr(S.String)),
}).annotations({ identifier: "Contact" });

export const GetContactsResponse = PaginatedResponse(Contact);

export function getContactsUrl(scope: "active" | "all" | "archived" = "all") {
  return [
    `https://api.givebutter.com/v1/contacts?scope=${scope}`,
    Contact,
  ] as const;
}
