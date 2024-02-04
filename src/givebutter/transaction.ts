import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";
import { BaseAddress } from "./contact";

export const GivingSpace = S.struct({
  id: S.number,
  name: S.string,
  amount: S.number,
  message: S.nullable(S.string),
});

export const LineItemDonation = S.struct({
  type: S.literal("donation"),
  subtype: S.literal("donation", "fee"),
  description: S.nullable(S.string),
  quantity: S.number,
  price: S.number,
  discount: S.number,
  total: S.number,
});

export const LineItemTicket = S.struct({
  type: S.literal("item"),
  subtype: S.literal("ticket"),
  description: S.nullable(S.string),
  quantity: S.number,
  price: S.number,
  discount: S.number,
  total: S.number,
});

export const LineItem = S.union(LineItemDonation, LineItemTicket);

export const SubTransaction = S.struct({
  id: S.string,
  plan_id: S.nullable(S.string),
  amount: S.number,
  fee: S.number,
  fee_covered: S.number,
  donated: S.number,
  payout: S.number,
  captured: S.boolean,
  captured_at: S.nullable(S.string),
  refunded: S.boolean,
  refunded_at: S.optional(S.nullable(S.string)),
  line_items: S.array(LineItem),
});

export const Transaction = S.struct({
  id: S.string,
  campaign_id: S.number,
  campaign_code: S.string,
  plan_id: S.nullable(S.string),
  team_id: S.nullable(S.string),
  member_id: S.nullable(S.union(S.string, S.number)),
  fund_id: S.nullable(S.string),
  fund_code: S.nullable(S.string),
  first_name: S.string,
  last_name: S.string,
  company: S.nullable(S.string),
  email: S.string,
  phone: S.nullable(S.string),
  address: S.nullable(BaseAddress),
  status: S.literal("succeeded", "authorized", "failed", "cancelled"),
  method: S.union(
    S.literal(
      "card",
      "paypal",
      "venmo",
      "check",
      "cash",
      "ach",
      "terminal",
      "none",
    ),
    S.string,
  ),
  // Presumably a legacy field
  payment_method: S.optional(S.unknown),
  amount: S.number,
  fee: S.number,
  fee_covered: S.number,
  donated: S.number,
  payout: S.number,
  currency: S.literal("USD"),
  transacted_at: S.string,
  created_at: S.string,
  giving_space: S.nullable(GivingSpace),
  dedication: S.nullable(S.string),
  transactions: S.array(SubTransaction),
  custom_fields: S.array(S.unknown),
  utm_parameters: S.union(
    S.array(S.never),
    S.record(
      S.union(
        S.literal(
          "referer",
          "utm_term",
          "utm_medium",
          "utm_source",
          "utm_content",
          "utm_campaign",
        ),
        S.string,
      ),
      S.string,
    ).pipe(S.partial, S.nullable),
  ),
  external_id: S.optional(S.nullable(S.unknown)),
  communication_opt_in: S.nullable(S.boolean),
  session_id: S.nullable(S.string),
  check_number: S.optional(S.nullable(S.unknown)),
  check_deposited_at: S.optional(S.nullable(S.string)),
});

export const GetTransactionsResponse = PaginatedResponse(Transaction);

export function getTransactionsUrl(
  scope: "all" | "benefiting" | "chapters" | null,
) {
  const prefix = "https://api.givebutter.com/v1/transactions";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Transaction] as const;
}
