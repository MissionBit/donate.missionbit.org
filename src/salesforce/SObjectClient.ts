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
import { SalesforceClient, SalesforceConfig } from "./http";
import { Contact } from "./Contact";
import { ParseError } from "@effect/schema/ParseResult";

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
      const okClient = dataClient.pipe(filterStatusOk);
      const unconditionalGetClient = dataClient.pipe(
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
        filterStatusOk,
        HttpClient.mapEffectScoped(
          HttpClientResponse.schemaBodyJson(querySchema),
        ),
      );
      return {
        schema,
        get: (id) =>
          getClient(
            HttpClientRequest.get(`${prefix}/${id}?fields=${allFields}`),
          ),
        update: (id, input) =>
          updateClient(HttpClientRequest.patch(`${prefix}/${id}`))(input),
        create: (input) => createClient(input),
        query: (where) =>
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
      } satisfies SObjectClientInstance<Self, Fields>;
    }),
  );
}

const makeClients = Effect.all({
  contact: sObjectClientBuilder(Contact),
} as const);

export class SObjectClient extends Context.Tag("@services/SObjectClient")<
  SObjectClient,
  Effect.Effect.Success<typeof makeClients>
>() {
  static Live = Layer.effect(SObjectClient, makeClients);
}
