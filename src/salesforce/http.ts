import {
  HttpClientRequest,
  HttpClientResponse,
  HttpBody,
  UrlParams,
  HttpClient,
} from "@effect/platform";
import { Effect, Config, Context, Layer, Scope } from "effect";
import { OAuthToken } from "./OAuthToken";
import { HttpClientError } from "@effect/platform/HttpClientError";

export class SalesforceRecordTypes extends Context.Tag(
  "@services/SalesforceRecordTypes",
)<
  SalesforceRecordTypes,
  {
    readonly Donation: string;
    readonly General: string;
    readonly Default: string;
  }
>() {
  static Live = Layer.effect(
    SalesforceRecordTypes,
    Effect.gen(function* () {
      return {
        Donation: yield* Config.string("SALESFORCE_RECORD_TYPE_ID_DONATION"),
        General: yield* Config.string("SALESFORCE_RECORD_TYPE_ID_GENERAL"),
        Default: yield* Config.string("SALESFORCE_RECORD_TYPE_ID_DEFAULT"),
      };
    }),
  );
}

export class SalesforceConfig extends Context.Tag("@services/SalesforceConfig")<
  SalesforceConfig,
  {
    readonly client: HttpClient.HttpClient<
      HttpClientResponse.HttpClientResponse,
      HttpClientError,
      Scope.Scope
    >;
    readonly servicesUrl: string;
    readonly dataUrl: string;
  }
>() {
  static Live = Layer.effect(
    SalesforceConfig,
    Effect.gen(function* () {
      const apiVersion = "v61.0";
      const instanceUrl = yield* Config.string("SALESFORCE_INSTANCE_URL");
      const servicesUrl = `${instanceUrl}/services`;
      const dataUrl = `${servicesUrl}/data/${apiVersion}`;
      const defaultClient = yield* HttpClient.HttpClient;
      const client = defaultClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.acceptJson),
      );
      return { client, servicesUrl, dataUrl };
    }),
  );
}

export class SalesforceClient extends Context.Tag("@services/SalesforceClient")<
  SalesforceClient,
  {
    readonly token: OAuthToken;
    readonly dataClient: HttpClient.HttpClient<
      HttpClientResponse.HttpClientResponse,
      HttpClientError,
      Scope.Scope
    >;
  }
>() {
  static Live = Layer.effect(
    SalesforceClient,
    Effect.gen(function* () {
      const cfg = yield* SalesforceConfig;
      const loginClient = cfg.client.pipe(
        HttpClient.mapEffectScoped(
          HttpClientResponse.schemaBodyJson(OAuthToken),
        ),
      );
      const req = HttpClientRequest.post(
        `${cfg.servicesUrl}/oauth2/token`,
      ).pipe(
        HttpClientRequest.setBody(
          HttpBody.urlParams(
            UrlParams.fromInput({
              grant_type: "client_credentials",
              client_id: yield* Config.string("SALESFORCE_CLIENT_ID"),
              client_secret: yield* Config.string("SALESFORCE_CLIENT_SECRET"),
            }),
          ),
        ),
      );
      const token = yield* loginClient(req);
      const dataClient = cfg.client.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl(cfg.dataUrl)),
        HttpClient.mapRequest(
          HttpClientRequest.bearerToken(token.access_token),
        ),
      );

      return {
        token,
        dataClient,
      };
    }),
  );
}