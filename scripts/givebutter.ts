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
  });
  return streamPages(firstUrl, schema).pipe(
    Stream.map((page) => ({ prefix, rows: page.data.map(toRow) })),
  );
}

const supabase = getSupabaseClient();

function upsert<T extends GivebutterObj>(
  pair: readonly [firstUrl: string, schema: S.Schema<T>],
): Effect.Effect<never, HttpClientError | ParseError | Error, void> {
  const stream = streamGivebutterPages(...pair);
  return Stream.runForEach(stream, ({ prefix, rows }) =>
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
        return count;
      },
      catch: (unknown) => new Error(`something went wrong ${unknown}`),
    }),
  );
}

function upsertMembers(
  campaignId: string | number,
): Effect.Effect<never, HttpClientError | ParseError | Error, void> {
  const stream = streamMemberPages(campaignId);
  return Stream.runForEach(stream, ({ prefix, rows }) =>
    Effect.tryPromise({
      try: async () => {
        const { error, count } = await supabase
          .from("givebutter_object")
          .upsert(rows, { count: "exact" });
        if (error) {
          throw error;
        }
        console.log(`Upserted ${count} rows from ${prefix}`);
        return count;
      },
      catch: (unknown) => new Error(`something went wrong ${unknown}`),
    }),
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
        .filter("id", "not.like", `${campaignPrefix}%/%`);
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
