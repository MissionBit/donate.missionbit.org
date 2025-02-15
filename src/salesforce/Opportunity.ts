import { Schema as S } from "@effect/schema";
import { OtherString } from "./OtherString";
import { Contact } from "./Contact";
import { Campaign } from "./Campaign";
import { RecurringDonation } from "./RecurringDonation";

export class Opportunity extends S.Class<Opportunity>("Opportunity")({
  Id: S.String,
  RecordTypeId: S.String, // "SALESFORCE_RECORD_TYPE_ID_DONATION" | "SALESFORCE_RECORD_TYPE_ID_MATCHING_GIFT" | "SALESFORCE_RECORD_TYPE_ID_SPECIAL_EVENT_REVENUE"
  Name: S.String, // "Donation #$donationId"
  ContactId: Contact.fields["Id"],
  CampaignId: S.NullOr(Campaign.fields["Id"]),
  Amount: S.Number,
  AccountId: Contact.fields["AccountId"],
  CloseDate: S.String, // "2021-01-01"
  StageName: S.Union(
    S.Literal(
      "Prospecting",
      "LOI Submitted",
      "Proposal Submitted",
      "Cultivating",
      "Ask Made",
      "Verbal Pledge",
      "Awarded",
      "Awarded - Fully Paid",
      "Posted",
      "Posted - Fully Paid",
      "Lost",
      "Withdrawn",
    ),
    OtherString,
  ),
  npe03__Recurring_Donation__c: S.NullOr(RecurringDonation.fields["Id"]),
  Stripe_Charge_ID__c: S.NullOr(S.String),
  Transaction_ID__c: S.NullOr(S.String),
  Form_of_Payment__c: S.NullOr(
    S.Union(
      S.Literal(
        "Givebutter",
        "Stripe",
        "Square",
        "Check",
        "Cash",
        "Other",
        "Wire",
      ),
      OtherString,
    ),
  ),
  Payment_Fees__c: S.NullOr(S.Number),
  Givebutter_Transaction_ID__c: S.NullOr(S.String),
}) {
  static apiName = "opportunity";
}
