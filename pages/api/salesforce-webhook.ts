import { NextApiHandler } from "next";
import Stripe from "stripe";
import getStripe from "src/getStripe";
import { buffer, RequestHandler } from "micro";
import Cors from "micro-cors";
import { login, stripeChargeSync } from "src/salesforce";
import requireEnv from "src/requireEnv";

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

export const runtime = "edge";
export const config = {
  runtime: "edge",
  api: {
    bodyParser: false,
  },
};

const handler: NextApiHandler = async (req, res) => {
  let event: Stripe.Event;
  try {
    const sig = req.headers["stripe-signature"];
    if (sig === undefined) {
      throw new Error(`Missing signature`);
    }
    event = stripe.webhooks.constructEvent(
      await buffer(req),
      sig,
      STRIPE_WEBHOOK_SIGNING_SECRET,
    );
  } catch (err) {
    console.error(err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }
  const handleEvent = HANDLERS[event.type] ?? defaultHandler;
  await handleEvent(event);
  res.status(200).json({ received: true });
};

export default Cors({
  allowMethods: ["POST", "HEAD"],
})(handler as RequestHandler);
