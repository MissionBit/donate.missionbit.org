import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Member = S.struct({
  id: S.number,
  first_name: S.nullable(S.string),
  last_name: S.nullable(S.string),
  email: S.nullable(S.string),
  phone: S.nullable(S.string),
  display_name: S.string,
  picture: S.string,
  raised: S.number,
  goal: S.number,
  donors: S.number,
  url: S.string,
  items: S.number,
});

export const GetMembersResponse = PaginatedResponse(Member);

export function getMembersUrl(campaignId: number | string) {
  return [
    `https://api.givebutter.com/v1/campaigns/${campaignId}/members`,
    Member,
  ] as const;
}
