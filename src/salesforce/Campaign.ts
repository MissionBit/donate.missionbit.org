import { Schema as S } from "@effect/schema";
import { OtherString } from "./OtherString";

// https://developer.salesforce.com/docs/atlas.en-us.252.0.object_reference.meta/object_reference/sforce_api_objects_campaign.htm

export class Campaign extends S.Class<Campaign>("Campaign")({
  Id: S.String,
  Name: S.String,
  Type: S.Union(
    S.Literal(
      "Event",
      "Fundraising",
      "Conference",
      "Content / White Paper",
      "Email",
      "PR",
      "Partners",
      "Referral Program",
      "Signup / Trial",
      "Social Media - Organic",
      "Social Media - Paid",
      "Webinar",
      "Other",
    ),
    OtherString,
  ),
  RecordTypeId: S.String, // "SALESFORCE_RECORD_TYPE_ID_DEFAULT"
  Description: S.NullOr(S.String),
  Status: S.String,
  StartDate: S.NullOr(S.String),
  EndDate: S.NullOr(S.String),
  Givebutter_Campaign_ID__c: S.NullOr(S.String),
}) {
  static apiName = "campaign";
}
