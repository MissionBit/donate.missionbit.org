import * as S from "@effect/schema/Schema";

export const OAuthToken = S.Struct({
  access_token: S.String,
  signature: S.String,
  scope: S.String,
  instance_url: S.String,
  id: S.String,
  token_type: S.String,
  issued_at: S.String,
}).annotations({
  identifier: "OAuthToken",
});
