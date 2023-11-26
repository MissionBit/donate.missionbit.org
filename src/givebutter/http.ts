import * as S from "@effect/schema/Schema";
import * as Http from "@effect/platform/HttpClient";
import { Chunk, Effect, Stream, Schedule, Option } from "effect";
import { givebutterAuth } from "./auth";
import { PaginatedResponse } from "./pagination";

const retrySchedule = Schedule.intersect(
  Schedule.recurs(3),
  Schedule.exponential("10 millis"),
);

export function giveButterGet<T>(url: string, schema: S.Schema<T>) {
  return Http.request
    .get(url)
    .pipe(
      Http.request.setHeaders(givebutterAuth()),
      Http.client.fetchOk().pipe(Http.client.retry(retrySchedule)),
      Effect.flatMap(Http.response.schemaBodyJson(schema)),
    );
}

export function streamPages<T>(firstUrl: string, schema: S.Schema<T>) {
  const paginatedSchema = PaginatedResponse(schema);
  return Stream.paginateEffect(firstUrl, (url) =>
    giveButterGet(url, paginatedSchema).pipe(
      Effect.map((page) => [page, Option.fromNullable(page.links.next)]),
    ),
  );
}

export function streamRows<T>(firstUrl: string, schema: S.Schema<T>) {
  return streamPages(firstUrl, schema).pipe(
    Stream.mapConcatChunk((page) => Chunk.unsafeFromArray(page.data)),
  );
}
