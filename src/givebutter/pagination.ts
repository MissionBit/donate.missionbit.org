import * as S from "@effect/schema/Schema";

export const PageLink = S.Struct({
  url: S.optional(S.NullishOr(S.String)),
  label: S.String,
  active: S.Boolean,
});

export const PaginatedResponse = <T>(T: S.Schema<T>) =>
  S.Struct({
    data: S.Array(T),
    links: S.Struct({
      first: S.String,
      last: S.String,
      prev: S.optional(S.NullishOr(S.String)),
      next: S.optional(S.NullishOr(S.String)),
    }),
    meta: S.Struct({
      current_page: S.Number,
      from: S.NullishOr(S.Number),
      last_page: S.Number,
      links: S.Array(PageLink),
      path: S.String,
      per_page: S.Number,
      to: S.NullishOr(S.Number),
      total: S.Number,
      unfiltered_total: S.optional(S.Number),
    }),
  });
