import * as S from "@effect/schema/Schema";
import { PaginatedResponse } from "./pagination";

export const Ticket = S.struct({
  id: S.string,
  id_suffix: S.string,
  transaction_id: S.string,
  name: S.string,
  first_name: S.string,
  last_name: S.string,
  email: S.string,
  phone: S.nullable(S.string),
  title: S.string,
  description: S.nullable(S.string),
  price: S.number,
  pdf: S.string,
  checked_in_at: S.nullable(S.string),
  created_at: S.string,
});

export const TicketsResponse = PaginatedResponse(Ticket);

export function getTicketsUrl() {
  return ["https://api.givebutter.com/v1/tickets", Ticket] as const;
}
