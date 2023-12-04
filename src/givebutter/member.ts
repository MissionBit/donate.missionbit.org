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

// members
export const EXAMPLE_MEMBERS_RESPONSE: S.Schema.To<typeof GetMembersResponse> =
  {
    data: [
      // Example phone numbers censored for privacy
      {
        id: 281693,
        first_name: "Johnny",
        last_name: "Lin",
        display_name: "Johnny Lin",
        email: "johnny@missionbit.org",
        phone: "+16285551212",
        picture: "https://givebutter.s3.amazonaws.com/assets/avatars/v2/JL.png",
        raised: 0,
        goal: 1000,
        donors: 0,
        items: 0,
        url: "https://givebutter.com/7eJRgQ/johnnylin",
      },
      {
        id: 281007,
        first_name: "Evalani",
        last_name: "Clark",
        display_name: "Evalani Clark",
        email: "evalani@missionbit.org",
        phone: "+17075551212",
        picture: "https://givebutter.s3.amazonaws.com/assets/avatars/v2/EC.png",
        raised: 501,
        goal: 0,
        donors: 2,
        items: 0,
        url: "https://givebutter.com/7eJRgQ/evalaniclark",
      },
    ],
    links: {
      first: "https://api.givebutter.com/v1/campaigns/178137/members?page=1",
      last: "https://api.givebutter.com/v1/campaigns/178137/members?page=1",
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
          url: "https://api.givebutter.com/v1/campaigns/178137/members?page=1",
          label: "1",
          active: true,
        },
        {
          url: null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      path: "https://api.givebutter.com/v1/campaigns/178137/members",
      per_page: 20,
      to: 2,
      total: 2,
    },
  };
