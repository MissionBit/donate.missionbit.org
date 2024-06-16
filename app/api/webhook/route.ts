import Stripe from "stripe";
import getStripe from "src/getStripe";
import getStripeKey from "src/getStripeKey";
import {
  stripeCheckoutSessionCompletedPaymentEmail,
  stripeInvoicePaymentEmail,
} from "src/stripeEmails";
import { eventObject, runHandler, stripeEventHandlers } from "src/stripe";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function stripeCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
) {
  const session: Stripe.Checkout.Session = eventObject(event);
  if (session.mode === "payment") {
    await stripeCheckoutSessionCompletedPaymentEmail(session.id);
    // track_donation(
    //     metadata=payment_intent.metadata, frequency="one-time", charge=charge
    // )
  }
}

async function stripeInvoicePaymentSucceeded(
  event: Stripe.InvoicePaymentSucceededEvent,
) {
  const obj: Stripe.Invoice = eventObject(event);
  await stripeInvoicePaymentEmail(obj.id);
  // track_donation(metadata=subscription.metadata, frequency="monthly", charge=charge)
}

async function stripeInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent,
) {
  const obj: Stripe.Invoice = eventObject(event);
  await stripeInvoicePaymentEmail(obj.id);
  // track_invoice_failure(
  //     metadata=subscription.metadata, frequency="monthly", charge=charge
  // )
}

const HANDLERS = stripeEventHandlers({
  "checkout.session.completed": stripeCheckoutSessionCompleted,
  "invoice.payment_succeeded": stripeInvoicePaymentSucceeded,
  "invoice.payment_failed": stripeInvoicePaymentFailed,
});

export async function POST(req: Request) {
  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    const sig = req.headers.get("stripe-signature") ?? undefined;
    if (sig === undefined) {
      throw new Error(`Missing signature`);
    }
    event = await stripe.webhooks.constructEventAsync(
      Buffer.from(await req.arrayBuffer()),
      sig,
      getStripeKey("STRIPE_WEBHOOK_SIGNING_SECRET"),
    );
  } catch (err) {
    console.error(err);
    return Response.json(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }
  await runHandler(HANDLERS, event);
  return Response.json({ received: true });
}
