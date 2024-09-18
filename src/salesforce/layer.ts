import { Layer } from "effect";
import {
  SalesforceRecordTypes,
  SalesforceClient,
  SalesforceConfig,
} from "./http";
import { SObjectClient } from "./SObjectClient";

export const SalesforceLive = SObjectClient.Live.pipe(
  Layer.provideMerge(SalesforceRecordTypes.Live),
  Layer.provideMerge(SObjectClient.Live),
  Layer.provideMerge(SalesforceClient.Live),
  Layer.provideMerge(SalesforceConfig.Live),
);
