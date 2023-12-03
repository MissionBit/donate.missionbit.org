import Stripe from "stripe";
import getStripe from "src/getStripe";
import getStripeKey from "src/getStripeKey";
import {
  stripeCheckoutSessionCompletedPaymentEmail,
  stripeInvoicePaymentEmail,
} from "src/stripeEmails";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const stripe = getStripe();

const STRIPE_WEBHOOK_SIGNING_SECRET = getStripeKey(
  "STRIPE_WEBHOOK_SIGNING_SECRET",
);

function eventObject<T extends Stripe.Event.Data.Object & { id: string }>(
  event: Stripe.Event,
) {
  const obj = event.data.object as T;
  console.log(`handling ${event.type} id: ${obj.id}`);
  return obj;
}

async function stripeCheckoutSessionCompleted(event: Stripe.Event) {
  const session: Stripe.Checkout.Session = eventObject(event);
  if (session.mode === "payment") {
    await stripeCheckoutSessionCompletedPaymentEmail(session.id);
    // track_donation(
    //     metadata=payment_intent.metadata, frequency="one-time", charge=charge
    // )
  }
}

async function stripeInvoicePaymentSucceeded(event: Stripe.Event) {
  const obj: Stripe.Invoice = eventObject(event);
  await stripeInvoicePaymentEmail(obj.id);
  // track_donation(metadata=subscription.metadata, frequency="monthly", charge=charge)
}

async function stripeInvoicePaymentFailed(event: Stripe.Event) {
  const obj: Stripe.Invoice = eventObject(event);
  await stripeInvoicePaymentEmail(obj.id);
  // track_invoice_failure(
  //     metadata=subscription.metadata, frequency="monthly", charge=charge
  // )
}

async function defaultHandler(event: Stripe.Event) {
  console.log(`${event.type} not handled id: ${event.id}`);
}

const HANDLERS: { [k: string]: (event: Stripe.Event) => Promise<void> } = {
  "checkout.session.completed": stripeCheckoutSessionCompleted,
  "invoice.payment_succeeded": stripeInvoicePaymentSucceeded,
  "invoice.payment_failed": stripeInvoicePaymentFailed,
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
