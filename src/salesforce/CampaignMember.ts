import { Schema as S } from "@effect/schema";

// https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_campaignmember.htm

export class CampaignMember extends S.Class<CampaignMember>("CampaignMember")({
  // AccountId: S.String,
  CampaignId: S.String,
  City: S.NullOr(S.String),
  CompanyOrAccount: S.NullOr(S.String),
  ContactId: S.NullOr(S.String),
  Country: S.NullOr(S.String),
  Description: S.NullOr(S.String),
  DoNotCall: S.Boolean,
  Email: S.NullOr(S.String),
  Fax: S.NullOr(S.String),
  FirstName: S.NullOr(S.String),
  FirstRespondedDate: S.NullOr(S.String),
  HasOptedOutOfEmail: S.Boolean,
  HasOptedOutOfFax: S.Boolean,
  HasResponded: S.Boolean,
  LastName: S.NullOr(S.String),
  LeadId: S.NullOr(S.String),
  LeadOrContactId: S.NullOr(S.String),
  LeadOrContactOwnerId: S.NullOr(S.String),
  LeadSource: S.NullOr(S.String),
  MobilePhone: S.NullOr(S.String),
  Name: S.NullOr(S.String),
  Phone: S.NullOr(S.String),
  PostalCode: S.NullOr(S.String),
  // RecordTypeId: S.NullOr(S.String),
  Salutation: S.NullOr(S.String),
  State: S.NullOr(S.String),
  Status: S.NullOr(S.String),
  Street: S.NullOr(S.String),
  Title: S.NullOr(S.String),
  Type: S.NullOr(S.String),
}) {
  static apiName = "CampaignMember";
}
