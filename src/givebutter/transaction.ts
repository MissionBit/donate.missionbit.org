import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";
import { BaseAddress } from "./contact";

export const GivingSpace = S.Struct({
  id: S.Number,
  name: S.String,
  amount: S.Number,
  message: S.NullishOr(S.String),
}).annotations({ identifier: "GivingSpace" });

export const LineItemDonation = S.Struct({
  type: S.Literal("donation"),
  subtype: S.Literal("donation", "fee"),
  description: S.NullishOr(S.String),
  quantity: S.Number,
  price: S.Number,
  discount: S.Number,
  total: S.Number,
}).annotations({ identifier: "LineItemDonation" });

export const LineItemTicket = S.Struct({
  type: S.Literal("item"),
  subtype: S.Literal("ticket"),
  description: S.NullishOr(S.String),
  quantity: S.Number,
  price: S.Number,
  discount: S.Number,
  total: S.Number,
}).annotations({ identifier: "LineItemTicket" });

export const LineItem = S.Union(LineItemDonation, LineItemTicket).annotations({
  identifier: "LineItem",
});

export const SubTransaction = S.Struct({
  id: S.String,
  plan_id: S.NullishOr(S.String),
  amount: S.Number,
  fee: S.Number,
  fee_covered: S.Number,
  donated: S.Number,
  payout: S.Number,
  captured: S.Boolean,
  captured_at: S.NullishOr(S.String),
  refunded: S.Boolean,
  refunded_at: S.optional(S.NullishOr(S.String)),
  line_items: S.Array(LineItem),
}).annotations({ identifier: "SubTransaction" });

export const Transaction = S.Struct({
  id: S.String,
  // Added 2024-06-10
  number: S.Union(S.String, S.Number),
  campaign_id: S.Number,
  campaign_code: S.String,
  plan_id: S.NullishOr(S.String),
  team_id: S.NullishOr(S.String),
  member_id: S.NullishOr(S.Union(S.String, S.Number)),
  fund_id: S.NullishOr(S.String),
  fund_code: S.NullishOr(S.String),
  // Added 2024-06-10
  contact_id: S.Union(S.String, S.Number),
  first_name: S.String,
  last_name: S.String,
  company: S.NullishOr(S.String),
  email: S.NullishOr(S.String),
  phone: S.NullishOr(S.String),
  address: S.NullishOr(BaseAddress),
  status: S.Literal("succeeded", "authorized", "failed", "cancelled"),
  method: S.Union(
    S.Literal(
      "card",
      "paypal",
      "venmo",
      "check",
      "cash",
      "ach",
      "terminal",
      "none",
    ),
    S.String,
  ),
  // Presumably a legacy field
  payment_method: S.optional(S.Unknown),
  amount: S.Number,
  fee: S.Number,
  fee_covered: S.Number,
  donated: S.Number,
  payout: S.Number,
  currency: S.Literal("USD"),
  transacted_at: S.String,
  created_at: S.String,
  giving_space: S.NullishOr(GivingSpace),
  dedication: S.NullishOr(S.String),
  transactions: S.Array(SubTransaction),
  custom_fields: S.Array(S.Unknown),
  utm_parameters: S.optional(
    S.NullishOr(
      S.Union(
        S.Array(S.Unknown),
        S.Struct(
          {
            referer: S.String,
            utm_term: S.String,
            utm_medium: S.String,
            utm_source: S.String,
            utm_content: S.String,
            utm_campaign: S.String,
          },
          S.Record({ key: S.String, value: S.String }),
        ).pipe(S.partial),
      ),
    ),
  ),
  external_id: S.optional(S.NullishOr(S.Unknown)),
  communication_opt_in: S.NullishOr(S.Boolean),
  session_id: S.NullishOr(S.String),
  check_number: S.optional(S.NullishOr(S.Unknown)),
  check_deposited_at: S.optional(S.NullishOr(S.String)),
  // Added 2024-06-10
  attribution_data: S.optional(S.NullishOr(S.Unknown)),
}).annotations({ identifier: "Transaction" });

export const GetTransactionsResponse = PaginatedResponse(Transaction);

export function getTransactionsUrl(
  scope: "all" | "benefiting" | "chapters" | null = "all",
) {
  const prefix = "https://api.givebutter.com/v1/transactions";
  return [scope ? `${prefix}?scope=${scope}` : prefix, Transaction] as const;
}
