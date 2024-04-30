import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Member = S.Struct({
  id: S.Number,
  first_name: S.NullishOr(S.String),
  last_name: S.NullishOr(S.String),
  email: S.NullishOr(S.String),
  phone: S.NullishOr(S.String),
  display_name: S.String,
  picture: S.String,
  raised: S.Number,
  goal: S.Number,
  donors: S.Number,
  url: S.String,
  items: S.Number,
});

export const GetMembersResponse = PaginatedResponse(Member);

export function getMembersUrl(campaignId: number | string) {
  return [
    `https://api.givebutter.com/v1/campaigns/${campaignId}/members`,
    Member,
  ] as const;
}
