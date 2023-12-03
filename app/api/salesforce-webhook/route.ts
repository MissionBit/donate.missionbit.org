import Stripe from "stripe";
import getStripe from "src/getStripe";
import { login, stripeChargeSync } from "src/salesforce";
import requireEnv from "src/requireEnv";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const stripe = getStripe();

const STRIPE_WEBHOOK_SIGNING_SECRET = requireEnv(
  "STRIPE_WEBHOOK_SIGNING_SECRET_SALESFORCE",
);

function eventObject<T extends Stripe.Event.Data.Object & { id: string }>(
  event: Stripe.Event,
) {
  const obj = event.data.object as T;
  console.log(`handling ${event.type} id: ${obj.id}`);
  return obj;
}

async function stripeChargeSucceeded(event: Stripe.Event) {
  const obj: Stripe.Charge = eventObject(event);
  await stripeChargeSync(await login(), obj.id);
}

async function defaultHandler(event: Stripe.Event) {
  console.log(`${event.type} not handled id: ${event.id}`);
}

const HANDLERS: { [k: string]: (event: Stripe.Event) => Promise<void> } = {
  // "checkout.session.completed": stripeCheckoutSessionCompleted,
  // "invoice.payment_succeeded": stripeInvoicePaymentSucceeded,
  // "invoice.payment_failed": stripeInvoicePaymentFailed,
  "charge.succeeded": stripeChargeSucceeded,
};

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature") ?? undefined;
    if (sig === undefined) {
      throw new Error(`Missing signature`);
    }
    event = await stripe.webhooks.constructEventAsync(
      Buffer.from(await req.arrayBuffer()),
      sig,
      STRIPE_WEBHOOK_SIGNING_SECRET,
    );
  } catch (err) {
    console.error(err);
    return Response.json(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }
  const handleEvent = HANDLERS[event.type] ?? defaultHandler;
  await handleEvent(event);
  return Response.json({ received: true });
}
