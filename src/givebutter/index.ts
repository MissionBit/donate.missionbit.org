import * as S from "@effect/schema/Schema";
// Docs: https://docs.givebutter.com/reference/

// TODO sync:
//  campaigns
//  plans
//  contacts
//  team members
//  transactions
//  tickets
//
//  campaign teams
//  payouts
//  funds

import { GetCampaignsResponse } from "./campaign";
import { givebutterAuth } from "./auth";

export async function getCampaigns(): Promise<
  S.Schema.To<typeof GetCampaignsResponse>
> {
  return fetch("https://api.givebutter.com/v1/campaigns", {
    headers: { ...givebutterAuth(), accept: "application/json" },
  }).then((res) => res.json());
}
