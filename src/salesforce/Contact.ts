import { Schema as S } from "@effect/schema";

// https://developer.salesforce.com/docs/atlas.en-us.252.0.object_reference.meta/object_reference/sforce_api_objects_contact.htm

export class Contact extends S.Class<Contact>("Contact")({
  Id: S.String,
  RecordTypeId: S.String, // "SALESFORCE_RECORD_TYPE_ID_GENERAL"
  AccountId: S.String,
  Stripe_Customer_ID__c: S.NullOr(S.String),
  Givebutter_Contact_ID__c: S.NullOr(S.String),
  Email: S.NullOr(S.String),
  FirstName: S.NullOr(S.String),
  MiddleName: S.NullOr(S.String),
  LastName: S.String,
  Description: S.NullOr(S.String),
  Suffix: S.NullOr(S.String),
  Donor__c: S.Boolean,
  Preferred_Name_Nickname__c: S.NullOr(S.String),
  Phone: S.NullOr(S.String),
  MailingCity: S.NullOr(S.String),
  MailingState: S.NullOr(S.String),
  MailingPostalCode: S.NullOr(S.String),
  MailingCountryCode: S.NullOr(S.String),
  MailingStreet: S.NullOr(S.String),
  npsp__Do_Not_Contact__c: S.Boolean,
  npe01__WorkPhone__c: S.NullOr(S.String),
  HasOptedOutOfEmail: S.Boolean,
  npe01__WorkEmail__c: S.NullOr(S.String),
  npe01__HomeEmail__c: S.NullOr(S.String),
  npe01__AlternateEmail__c: S.NullOr(S.String),
}) {
  static apiName = "contact";
}
