import { Schema as S } from "@effect/schema";
import { OtherString } from "./OtherString";
import { Contact } from "./Contact";
import { Account } from "./Account";

export class RecurringDonation extends S.Class<RecurringDonation>(
  "RecurringDonation",
)({
  Id: S.String,
  Name: S.String,
  npe03__Contact__c: S.NullOr(Contact.fields["Id"]),
  npe03__Organization__c: Account.fields["Id"],
  npe03__Amount__c: S.Number,
  npe03__Installment_Period__c: S.Union(
    S.Literal("Monthly", "Yearly"),
    OtherString,
  ),
  npsp__InstallmentFrequency__c: S.Number,
  npsp__EndDate__c: S.NullOr(S.String),
  npsp__Status__c: S.Union(
    S.Literal("Active", "Lapsed", "Closed", "Paused", "Failing"),
    OtherString,
  ),
  npsp__Day_of_Month__c: S.String,
  npe03__Date_Established__c: S.String,
  Stripe_Subscription_ID__c: S.NullOr(S.String),
  Givebutter_Plan_ID__c: S.NullOr(S.String),
}) {
  static apiName = "npe03__Recurring_Donation__c";
}
