import { Schema as S } from "@effect/schema";
import { OtherString } from "./OtherString";

// https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm

export class Account extends S.Class<Account>("Account")({
  Id: S.String,
  Name: S.String,
  Type: S.NullOr(
    S.Union(
      S.Literal(
        "School",
        "Foundation",
        "Government",
        "Business",
        "Nonprofit",
        "Community Organization",
        "Middle School",
        "Household",
        "Company",
        "High School",
        "College/University",
      ),
      OtherString,
    ),
  ),
  RecordTypeId: S.String, // "SALESFORCE_RECORD_TYPE_ID_ORGANIZATION" | "SALESFORCE_RECORD_TYPE_ID_HOUSEHOLD"
  Givebutter_Contact_ID__c: S.NullOr(S.String),
  // TODO Many other fields to consider here
}) {
  static apiName = "account";
}
