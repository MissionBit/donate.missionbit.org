import Stripe from "stripe";
import getStripe from "src/getStripe";
import { login, stripeChargeSync } from "src/salesforce";
import requireEnv from "src/requireEnv";
import { eventObject, runHandler, stripeEventHandlers } from "src/stripe";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function stripeChargeSucceeded(event: Stripe.ChargeSucceededEvent) {
  const obj: Stripe.Charge = eventObject(event);
  await stripeChargeSync(await login(), obj.id);
}

const HANDLERS = stripeEventHandlers({
  // "checkout.session.completed": stripeCheckoutSessionCompleted,
  // "invoice.payment_succeeded": stripeInvoicePaymentSucceeded,
  // "invoice.payment_failed": stripeInvoicePaymentFailed,
  "charge.succeeded": stripeChargeSucceeded,
});

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature") ?? undefined;
    if (sig === undefined) {
      throw new Error(`Missing signature`);
    }
    event = await getStripe().webhooks.constructEventAsync(
      Buffer.from(await req.arrayBuffer()),
      sig,
      requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET_SALESFORCE"),
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
