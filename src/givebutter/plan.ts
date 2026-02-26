import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Plan = S.Struct({
  id: S.String,
  first_name: S.String,
  last_name: S.String,
  email: S.String,
  phone: S.NullishOr(S.String),
  frequency: S.Literal("monthly", "quarterly", "yearly"),
  status: S.Literal(
    "active",
    "cancelled",
    "ended",
    "past_due",
    "past_due_failed",
    "paused",
  ),
  method: S.String,
  amount: S.Number,
  fee_covered: S.String,
  created_at: S.String,
  start_at: S.String,
  next_bill_date: S.String,
}).annotations({ identifier: "Plan" });

export const GetPlansResponse = PaginatedResponse(Plan);

export function getPlansUrl() {
  return ["https://api.givebutter.com/v1/plans", Plan] as const;
}
