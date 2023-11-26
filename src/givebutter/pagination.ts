import * as S from "@effect/schema/Schema";

export const PageLink = S.struct({
  url: S.optional(S.nullable(S.string)),
  label: S.string,
  active: S.boolean,
});

export const PaginatedResponse = <T>(T: S.Schema<T>) =>
  S.struct({
    data: S.array(T),
    links: S.struct({
      first: S.string,
      last: S.string,
      prev: S.optional(S.nullable(S.string)),
      next: S.optional(S.nullable(S.string)),
    }),
    meta: S.struct({
      current_page: S.number,
      from: S.nullable(S.number),
      last_page: S.number,
      links: S.array(PageLink),
      path: S.string,
      per_page: S.number,
      to: S.nullable(S.number),
      total: S.number,
      unfiltered_total: S.optional(S.number),
    }),
  });
