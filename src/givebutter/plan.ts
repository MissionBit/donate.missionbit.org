import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Plan = S.struct({
  id: S.string,
  first_name: S.string,
  last_name: S.string,
  email: S.string,
  phone: S.nullable(S.string),
  frequency: S.literal("monthly", "quarterly", "yearly"),
  status: S.literal("active", "cancelled", "ended", "past_due", "paused"),
  method: S.string,
  amount: S.number,
  fee_covered: S.string,
  created_at: S.string,
  start_at: S.string,
  next_bill_date: S.string,
});

export const GetPlansResponse = PaginatedResponse(Plan);

export function getPlansUrl() {
  return ["https://api.givebutter.com/v1/plans", Plan] as const;
}
