import * as S from "@effect/schema/Schema";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  Headers,
} from "@effect/platform";
import {
  Chunk,
  Effect,
  Stream,
  Schedule,
  Option,
  Context,
  RateLimiter,
  Layer,
  Console,
} from "effect";
import { givebutterAuth } from "./auth";
import { PaginatedResponse } from "./pagination";

const retrySchedule = Schedule.intersect(
  Schedule.recurs(3),
  Schedule.exponential("10 millis"),
);

const logResponse =
  (url: string) => (response: HttpClientResponse.HttpClientResponse) =>
    Effect.gen(function* (_) {
      const limit = yield* Headers.get(response.headers, "x-ratelimit-limit");
      const remaining = yield* Headers.get(
        response.headers,
        "x-ratelimit-remaining",
      );
      yield* Console.log(
        `STATUS: ${response.status} LIMIT: ${remaining}/${limit} ${url}`,
      );
    });

export function giveButterGet<T>(url: string, schema: S.Schema<T>) {
  return Effect.gen(function* (_) {
    const limiter = yield* ApiLimiter;
    return yield* limiter(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders(givebutterAuth()),
        HttpClient.fetchOk,
        Effect.tap(logResponse(url)),
        Effect.tapErrorTag("ResponseError", ({ response }) =>
          logResponse(url)(response),
        ),
        Effect.retry(retrySchedule),
        Effect.andThen(HttpClientResponse.schemaBodyJson(schema)),
        Effect.withSpan("giveButterGet", { attributes: { url } }),
      ),
    );
  });
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

export class ApiLimiter extends Context.Tag("@services/ApiLimiter")<
  ApiLimiter,
  RateLimiter.RateLimiter
>() {
  static Live = RateLimiter.make({ limit: 10, interval: "5 seconds" }).pipe(
    Layer.scoped(ApiLimiter),
  );
}
