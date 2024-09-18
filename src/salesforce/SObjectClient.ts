import {
  Option,
  Struct,
  Predicate,
  Effect,
  Context,
  Layer,
  Stream,
  Chunk,
} from "effect";
import {
  HttpClientRequest,
  HttpClientResponse,
  HttpClient,
  HttpClientError,
} from "@effect/platform";
import { Schema as S } from "@effect/schema";
import { filterStatusOk } from "@effect/platform/HttpClient";
import { ParseError } from "@effect/schema/ParseResult";
import { SalesforceClient, SalesforceConfig } from "./http";
import { Contact } from "./Contact";
import { Campaign } from "./Campaign";
import { Opportunity } from "./Opportunity";
import { RecurringDonation } from "./RecurringDonation";

const filterStatusOkDebug = <E, R>(
  self: HttpClient.HttpClient.WithResponse<E, R>,
): HttpClient.HttpClient.WithResponse<HttpClientError.ResponseError | E, R> =>
  filterStatusOk(self).pipe(
    HttpClient.transformResponse(
      Effect.tapErrorTag("ResponseError", (err) =>
        Effect.gen(function* () {
          if (err instanceof HttpClientError.ResponseError) {
            const text = yield* err.response.text;
            yield* Effect.annotateCurrentSpan("errorText", text);
          }
        }),
      ),
    ),
  );

export class SObjectResponse extends S.Class<SObjectResponse>(
  "SObjectResponse",
)({
  id: S.String,
  success: S.Literal(true),
  errors: S.Tuple(),
}) {}

export interface SObjectClientInstance<
  Self extends {
    readonly Id: string;
  },
  Fields extends S.Struct.Fields,
> {
  schema: S.Schema<Self> & {
    readonly apiName: string;
    readonly fields: Fields;
  };
  get: (
    id: Self["Id"],
  ) => Effect.Effect<
    Option.Option<Self>,
    HttpClientError.HttpClientError | ParseError
  >;
  update: (
    id: Self["Id"],
    updates: Partial<Omit<Self, "Id">>,
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>;
  create: (
    input: Partial<Omit<Self, "Id">>,
  ) => Effect.Effect<Self, HttpClientError.HttpClientError | ParseError>;
  query: (
    where: string,
  ) => Stream.Stream<Self, HttpClientError.HttpClientError | ParseError>;
  withCache: <E, R>(
    id: string,
    eff: () => Effect.Effect<Self, E, R>,
  ) => Effect.Effect<Self, E, R>;
}

const makeQuerySchema = <T>(schema: S.Schema<T>) =>
  S.Struct({
    records: S.Array(schema),
    done: S.Boolean,
    totalSize: S.Int,
    nextRecordsUrl: S.optional(S.String),
  }).pipe(S.annotations({ identifier: "SObjectQueryResponse" }));

function sObjectClientBuilder<
  Self extends {
    readonly Id: string;
  },
  Fields extends S.Struct.Fields,
>(
  schema: S.Schema<Self> & {
    readonly apiName: string;
    readonly fields: Fields;
  },
) {
  const prefix = `/sobjects/${schema.apiName}`;
  const withoutId = schema.pipe(S.omit("Id"));
  const updateSchema = S.partial(withoutId);
  const allFields = Struct.keys(schema.fields).join(",");
  const postRequest = HttpClientRequest.post(prefix);
  const queryTemplate = `SELECT ${allFields} FROM ${schema.apiName} WHERE `;
  const querySchema = makeQuerySchema(schema);
  return Effect.all([SalesforceClient, SalesforceConfig]).pipe(
    Effect.andThen(([{ authClient, dataClient }, { dataUrl }]) => {
      const queryReq = HttpClientRequest.get(`${dataUrl}/query/`);
      const okClient = dataClient.pipe(filterStatusOkDebug);
      const unconditionalGetClient = okClient.pipe(
        HttpClient.mapEffectScoped(HttpClientResponse.schemaBodyJson(schema)),
      );
      const getClient = unconditionalGetClient.pipe(
        HttpClient.map(Option.some),
        HttpClient.transformResponse(
          Effect.catchIf(
            (e) =>
              Predicate.isTagged("ResponseError")(e) &&
              e.response.status === 404,
            (): Effect.Effect<Option.Option<Self>, never, never> =>
              Effect.succeedNone,
          ),
        ),
      );
      const updateClient = HttpClient.schemaFunction(
        okClient.pipe(HttpClient.mapEffectScoped(() => Effect.void)),
        updateSchema,
      );
      const createClient = HttpClient.schemaFunction(
        okClient.pipe(
          HttpClient.mapEffectScoped(
            HttpClientResponse.schemaBodyJson(SObjectResponse),
          ),
          HttpClient.mapEffectScoped((res) =>
            unconditionalGetClient(
              HttpClientRequest.get(`${prefix}/${res.id}?fields=${allFields}`),
            ),
          ),
        ),
        updateSchema,
      )(postRequest);
      const queryClient = authClient.pipe(
        filterStatusOkDebug,
        HttpClient.mapEffectScoped(
          HttpClientResponse.schemaBodyJson(querySchema),
        ),
      );
      const cache = new Map<string, Self>();
      return {
        schema,
        get: (id) =>
          Effect.withSpan(
            getClient(
              HttpClientRequest.get(`${prefix}/${id}?fields=${allFields}`),
            ),
            "SObjectClient.get",
            { attributes: { id, apiName: schema.apiName } },
          ),
        update: (id, input) =>
          Effect.withSpan(
            updateClient(HttpClientRequest.patch(`${prefix}/${id}`))(input),
            "SObjectClient.update",
            { attributes: { id, input, apiName: schema.apiName } },
          ),
        create: (input) =>
          Effect.withSpan(createClient(input), "SObjectClient.create", {
            attributes: { input },
          }),
        query: (where) =>
          Stream.withSpan(
            Stream.paginateChunkEffect(
              queryReq.pipe(
                HttpClientRequest.appendUrlParam(
                  "q",
                  `${queryTemplate} ${where}`,
                ),
              ),
              (req) =>
                Effect.gen(function* () {
                  const { records, nextRecordsUrl } = yield* queryClient(req);
                  return [
                    Chunk.unsafeFromArray(records),
                    Option.fromNullable(nextRecordsUrl).pipe(
                      Option.map((url) =>
                        HttpClientRequest.setUrl(url)(queryReq),
                      ),
                    ),
                  ];
                }),
            ),
            "SObjectClient.query",
            {
              attributes: { where, apiName: schema.apiName },
            },
          ),
        withCache: (id, eff) =>
          Effect.withSpan(
            Effect.gen(function* () {
              const cached = cache.get(id);
              yield* Effect.annotateCurrentSpan("miss", cached === undefined);
              if (cached) {
                yield* Effect.annotateCurrentSpan("value.Id", cached.Id);
                return cached;
              } else {
                const v = yield* eff();
                yield* Effect.annotateCurrentSpan("value.Id", v.Id);
                cache.set(id, v);
                return v;
              }
            }),
            "SObjectClient.withCache",
            { attributes: { id, apiName: schema.apiName } },
          ),
      } satisfies SObjectClientInstance<Self, Fields>;
    }),
  );
}

const makeClients = Effect.all({
  contact: sObjectClientBuilder(Contact),
  campaign: sObjectClientBuilder(Campaign),
  opportunity: sObjectClientBuilder(Opportunity),
  recurringDonation: sObjectClientBuilder(RecurringDonation),
} as const);

export class SObjectClient extends Context.Tag("@services/SObjectClient")<
  SObjectClient,
  Effect.Effect.Success<typeof makeClients>
>() {
  static Live = Layer.effect(SObjectClient, makeClients);
}
