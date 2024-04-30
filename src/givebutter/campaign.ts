import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const CampaignEvent = S.Struct({
  title: S.String,
  type: S.Union(S.Literal("physical"), S.String),
  location_name: S.NullishOr(S.String),
  address_formatted: S.String,
  google_place_id: S.String,
  start_at: S.String,
  end_at: S.String,
  timezone: S.String,
  details: S.NullishOr(S.String),
  private: S.Boolean,
  tickets_required: S.Boolean,
  livestream: S.NullishOr(S.String),
  livestream_start_at: S.NullishOr(S.String),
  livestream_end_at: S.NullishOr(S.String),
});

export const CoverImage = S.Struct({
  url: S.String,
  type: S.Literal("image"),
  source: S.Literal("upload"),
});
export const CoverVideo = S.Struct({
  url: S.String,
  type: S.Literal("video"),
  source: S.Literal("youtube"),
  embed_url: S.String,
});
export const Cover = S.Union(CoverImage, CoverVideo);

export const Campaign = S.Struct({
  id: S.Number,
  code: S.String,
  type: S.Literal("general", "collect", "fundraise", "event"),
  status: S.Literal("active", "inactive", "unpublished"),
  title: S.String,
  subtitle: S.NullishOr(S.String),
  description: S.NullishOr(S.String),
  slug: S.NullishOr(S.String),
  raised: S.Number,
  goal: S.NullishOr(S.Number),
  donors: S.Number,
  end_at: S.NullishOr(S.String),
  url: S.String,
  currency: S.Literal("USD"),
  cover: S.optional(S.NullishOr(Cover)),
  created_at: S.String,
  updated_at: S.String,
  account_id: S.String,
  event: S.optional(S.NullishOr(CampaignEvent)),
});

export function getCampaignsUrl(
  scope: "benefiting" | "chapters" | "all" | null = "all",
) {
  const prefix = "https://api.givebutter.com/v1/campaigns";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Campaign] as const;
}

export const GetCampaignsResponse = PaginatedResponse(Campaign);
