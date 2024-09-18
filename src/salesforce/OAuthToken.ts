import { Schema as S } from "@effect/schema";

export class OAuthToken extends S.Class<OAuthToken>("OAuthToken")({
  access_token: S.String,
  signature: S.String,
  scope: S.String,
  instance_url: S.String,
  id: S.String,
  token_type: S.String,
  issued_at: S.String,
}) {}
