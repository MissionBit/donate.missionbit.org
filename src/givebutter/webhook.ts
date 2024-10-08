import * as S from "@effect/schema/Schema";
import * as AST from "@effect/schema/AST";
import { Campaign } from "./campaign";
import { Ticket } from "./ticket";
import { Transaction } from "./transaction";
import { Contact } from "./contact";
import { Option } from "effect";

function makeWebhook<
  Event extends string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends S.Schema<any, any>,
>(event: Event, data: Data) {
  return S.Struct({
    event: S.Literal(event),
    data,
    id: S.optional(S.String),
  }).annotations({
    identifier: `Webhook<${event}, ${AST.getIdentifierAnnotation(data.ast).pipe(Option.getOrElse(() => "unknown"))}>`,
  });
}

export const CampaignCreated = makeWebhook("campaign.created", Campaign);
export const CampaignUpdated = makeWebhook("campaign.updated", Campaign);
export const TicketCreated = makeWebhook("ticket.created", Ticket);
export const TransactionSucceeded = makeWebhook(
  "transaction.succeeded",
  Transaction,
);
export const ContactCreated = makeWebhook("contact.created", Contact);

export const Webhook = S.Union(
  CampaignCreated,
  CampaignUpdated,
  TicketCreated,
  TransactionSucceeded,
  ContactCreated,
);
