import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Ticket = S.Struct({
  id: S.String,
  id_suffix: S.String,
  transaction_id: S.String,
  name: S.String,
  first_name: S.String,
  last_name: S.String,
  email: S.String,
  phone: S.NullishOr(S.String),
  title: S.String,
  description: S.NullishOr(S.String),
  price: S.Number,
  pdf: S.String,
  checked_in_at: S.NullishOr(S.String),
  created_at: S.String,
}).annotations({ identifier: "Ticket" });

export const TicketsResponse = PaginatedResponse(Ticket);

export function getTicketsUrl() {
  return ["https://api.givebutter.com/v1/tickets", Ticket] as const;
}
