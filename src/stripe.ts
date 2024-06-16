import Stripe from "stripe";

export function eventObject<
  T extends Stripe.Event & { data: { object: { id: string } } },
>(event: T): T["data"]["object"] {
  const obj = event.data.object;
  console.log(`handling ${event.type} id: ${obj.id}`);
  return obj;
}

export type EventHandlerOfType<K> = (
  event: Stripe.Event &
    (K extends Stripe.Event["type"] ? { type: K } : unknown),
) => Promise<void>;

export type StripeEventHandlers = {
  [K in Stripe.Event["type"]]?: EventHandlerOfType<K>;
};

export function stripeEventHandlers<T extends StripeEventHandlers>(obj: T) {
  return obj;
}

export async function defaultHandler(event: Stripe.Event) {
  console.log(`${event.type} not handled id: ${event.id}`);
}

export async function runHandler<T extends StripeEventHandlers>(
  handlers: T,
  event: Stripe.Event,
): Promise<void> {
  const handler = (handlers[event.type] ??
    defaultHandler) as typeof defaultHandler;
  await handler(event);
}
