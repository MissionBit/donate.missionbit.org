import { Effect, Stream } from "effect";
import * as S from "@effect/schema/Schema";
import { getSupabaseClient } from "src/getSupabaseClient";
import { getCampaignsUrl } from "src/givebutter/campaign";
import { streamPages } from "src/givebutter/http";
import { getContactsUrl } from "src/givebutter/contact";
import { getPlansUrl } from "src/givebutter/plan";
import { getTransactionsUrl } from "src/givebutter/transaction";
import { getTicketsUrl } from "src/givebutter/ticket";
import { HttpClientError } from "@effect/platform/Http/ClientError";
import { ParseError } from "@effect/schema/ParseResult";
import { getMembersUrl, Member } from "src/givebutter/member";

type GivebutterObj = Readonly<{
  id: string | number;
  created_at: string;
  updated_at?: string;
}>;

function toSupabaseRow(prefix: string) {
  return <T extends GivebutterObj>(obj: T) => ({
    id: `${prefix}/${obj.id}`,
    created_at: obj.created_at,
    updated_at: obj.updated_at ?? obj.created_at,
    data: obj,
  });
}

function streamGivebutterPages<T extends GivebutterObj>(
  firstUrl: string,
  schema: S.Schema<T>,
) {
  const prefix = urlPrefix(firstUrl);
  const toRow = toSupabaseRow(prefix);
  return streamPages(firstUrl, schema).pipe(
    Stream.map((page) => ({ prefix, rows: page.data.map(toRow) })),
  );
}

function urlPrefix(firstUrl: string) {
  const url = new URL(firstUrl);
  url.search = "";
  return url.toString();
}

function streamMemberPages(campaignId: string | number) {
  const [firstUrl, schema] = getMembersUrl(campaignId);
  const prefix = urlPrefix(firstUrl);
  const toRow = (obj: S.Schema.To<typeof Member>) => ({
    id: `${prefix}/${obj.id}`,
    data: obj,
    deleted_at: null,
  });
  return streamPages(firstUrl, schema).pipe(
    Stream.map((page) => ({ prefix, rows: page.data.map(toRow) })),
    Stream.catchTag("ResponseError", (err) =>
      err.response.status === 404 ? Stream.empty : Stream.fail(err),
    ),
  );
}

const supabase = getSupabaseClient();

function markDeleted(prefix: string) {
  return (ids: Set<string>) =>
    Effect.tryPromise({
      try: async () => {
        console.log(`TOTAL: ${ids.size} from ${prefix}`);
        const rv = await supabase
          .from("givebutter_object")
          .select("*", { count: "exact", head: true })
          .like("id", `${prefix}/%`)
          .filter("id", "not.like", `${prefix}/%/%`)
          .is("deleted_at", null);
        if (rv.error || rv.count === null) {
          const { data: _data, ...rest } = rv;
          console.error(rest);
          throw new Error(`Count not get count for ${prefix}`);
        }
        if (rv.count <= ids.size) {
          return;
        }
        const rv1 = await supabase
          .from("givebutter_object")
          .select("*")
          .like("id", `${prefix}/%`)
          .filter("id", "not.like", `${prefix}/%/%`)
          .is("deleted_at", null);
        if (rv1.error) {
          const { data: _data, ...rest } = rv1;
          console.log(rest);
          throw new Error(`Count not get existing ids for ${prefix}`);
        }
        const deletedIds = rv1.data.flatMap((row) =>
          ids.has(row.id) ? [] : [row.id],
        );
        console.log(`Marking ${deletedIds.length} rows as deleted`);
        console.log(deletedIds.map((v) => "- " + v).join("\n"));
        const rv2 = await supabase
          .from("givebutter_object")
          .update({ deleted_at: "now()" }, { count: "exact" })
          .like("id", `${prefix}/%`)
          .filter("id", "not.like", `${prefix}/%/%`)
          .is("deleted_at", null)
          .in("id", deletedIds);
        if (rv2.error || rv2.count === null) {
          console.log(rv2);
          throw new Error(`Error marking rows as deleted ${rv.error}`);
        }
        console.log(`Marked ${rv2.count} rows as deleted`);
      },
      catch: (err) => new Error(`something went wrong ${err}`),
    });
}

function upsert<T extends GivebutterObj>(
  pair: readonly [firstUrl: string, schema: S.Schema<T>],
): Effect.Effect<never, HttpClientError | ParseError | Error, void> {
  return streamGivebutterPages(...pair).pipe(
    Stream.runFoldEffect(new Set<string>(), (acc, { prefix, rows }) =>
      Effect.tryPromise({
        try: async () => {
          const { error, count } = await supabase
            .from("givebutter_object")
            .upsert(rows, { count: "exact" });
          if (error) {
            console.error(`Error with ${prefix}`);
            throw error;
          }
          console.log(`Upserted ${count} rows from ${prefix}`);
          for (const row of rows) {
            acc.add(row.id);
          }
          return acc;
        },
        catch: (unknown) => new Error(`something went wrong ${unknown}`),
      }),
    ),
    Effect.andThen(markDeleted(urlPrefix(pair[0]))),
  );
}

function upsertMembers(
  campaignId: string | number,
): Effect.Effect<never, HttpClientError | ParseError | Error, void> {
  return streamMemberPages(campaignId).pipe(
    Stream.runFoldEffect(new Set<string>(), (acc, { prefix, rows }) =>
      Effect.tryPromise({
        try: async () => {
          const { error, count } = await supabase
            .from("givebutter_object")
            .upsert(rows, { count: "exact" });
          if (error) {
            throw error;
          }
          console.log(`Upserted ${count} rows from ${prefix}`);
          for (const row of rows) {
            acc.add(row.id);
          }
          return acc;
        },
        catch: (unknown) => new Error(`something went wrong ${unknown}`),
      }),
    ),
    Effect.andThen(markDeleted(urlPrefix(getMembersUrl(campaignId)[0]))),
  );
}

function upsertCampaignMembers() {
  return Effect.tryPromise({
    try: async () => {
      const campaignPrefix = `${urlPrefix(getCampaignsUrl()[0])}/`;
      const prefixLength = campaignPrefix.length;
      const { data, error } = await supabase
        .from("givebutter_object")
        .select("id")
        .filter("id", "like", `${campaignPrefix}%`)
        .filter("id", "not.like", `${campaignPrefix}%/%`)
        .is("deleted_at", null);
      if (error) {
        throw error;
      }
      return data.map((row) => row.id.slice(prefixLength));
    },
    catch: (unknown) => new Error(`something went wrong ${unknown}`),
  }).pipe(Effect.flatMap((ids) => Effect.all(ids.map(upsertMembers))));
}

async function main() {
  Effect.runPromise(
    Effect.all([
      upsert(getCampaignsUrl("all")),
      upsert(getContactsUrl("all")),
      upsert(getPlansUrl()),
      upsert(getTransactionsUrl("all")),
      upsert(getTicketsUrl()),
      upsertCampaignMembers(),
    ]),
  );
}

main();
