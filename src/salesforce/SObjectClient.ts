import { Option, Struct, Predicate, Effect, Context, Layer } from "effect";
import {
  HttpClientRequest,
  HttpClientResponse,
  HttpClient,
} from "@effect/platform";
import { Schema as S } from "@effect/schema";
import { filterStatusOk } from "@effect/platform/HttpClient";
import { SalesforceClient } from "./http";
import { Contact } from "./Contact";

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
  return SalesforceClient.pipe(
    Effect.andThen(({ dataClient }) => {
      const okClient = dataClient.pipe(filterStatusOk);
      const getClient = dataClient.pipe(
        HttpClient.mapEffectScoped((res) =>
          HttpClientResponse.schemaBodyJson(schema)(res).pipe(
            Effect.map(Option.some),
            Effect.catchIf(
              (e) =>
                Predicate.isTagged("ResponseError")(e) &&
                e.response.status === 404,
              () => Effect.succeedNone,
            ),
          ),
        ),
      );
      const updateClient = HttpClient.schemaFunction(okClient, updateSchema);
      const createClient = HttpClient.schemaFunction(
        okClient,
        withoutId,
      )(postRequest);
      return {
        schema,
        get: (id: typeof schema.Type.Id) =>
          getClient(
            HttpClientRequest.get(`${prefix}/${id}?fields=${allFields}`),
          ),
        update: (id: typeof schema.Type.Id, input: typeof updateSchema.Type) =>
          updateClient(HttpClientRequest.patch(`${prefix}/${id}`))(input),
        create: (input: typeof withoutId.Type) => createClient(input),
      } as const;
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
