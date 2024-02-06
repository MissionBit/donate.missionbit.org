import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const CampaignEvent = S.struct({
  title: S.string,
  type: S.union(S.literal("physical"), S.string),
  location_name: S.nullable(S.string),
  address_formatted: S.string,
  google_place_id: S.string,
  start_at: S.string,
  end_at: S.string,
  timezone: S.string,
  details: S.nullable(S.string),
  private: S.boolean,
  tickets_required: S.boolean,
  livestream: S.nullable(S.string),
  livestream_start_at: S.nullable(S.string),
  livestream_end_at: S.nullable(S.string),
});

export const CoverImage = S.struct({
  url: S.string,
  type: S.literal("image"),
  source: S.literal("upload"),
});
export const CoverVideo = S.struct({
  url: S.string,
  type: S.literal("video"),
  source: S.literal("youtube"),
  embed_url: S.string,
});
export const Cover = S.union(CoverImage, CoverVideo);

export const Campaign = S.struct({
  id: S.number,
  code: S.string,
  type: S.literal("general", "collect", "fundraise", "event"),
  status: S.literal("active", "inactive", "unpublished"),
  title: S.string,
  subtitle: S.nullable(S.string),
  description: S.nullable(S.string),
  slug: S.nullable(S.string),
  raised: S.number,
  goal: S.nullable(S.number),
  donors: S.number,
  end_at: S.nullable(S.string),
  url: S.string,
  currency: S.literal("USD"),
  cover: S.optional(S.nullable(Cover)),
  created_at: S.string,
  updated_at: S.string,
  account_id: S.string,
  event: S.optional(S.nullable(CampaignEvent)),
});

export function getCampaignsUrl(
  scope: "benefiting" | "chapters" | "all" | null = "all",
) {
  const prefix = "https://api.givebutter.com/v1/campaigns";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Campaign] as const;
}

export const GetCampaignsResponse = PaginatedResponse(Campaign);
