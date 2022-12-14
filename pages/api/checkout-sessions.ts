import { NextApiHandler } from "next";
import Stripe from "stripe";
import getStripe from "src/getStripe";
import { Frequency, FREQUENCIES } from "src/stripeHelpers";
import { getOrigin } from "src/absoluteUrl";
import { APP } from "src/stripeMetadata";

const MONTHLY_PLAN_ID = "mb-monthly-001";

const stripe = getStripe();

const MIN_AMOUNT = 1 * 100;
const MAX_AMOUNT = 1000000 * 100;

interface PostBody {
  amount: number;
  frequency: Frequency;
  metadata: { [k: string]: string };
}

function isFrequency(s: unknown): s is Frequency {
  return (FREQUENCIES as readonly unknown[]).indexOf(s) >= 0;
}

function stringObject(obj: unknown): { [k: string]: string } {
  return obj && typeof obj === "object"
    ? Object.fromEntries(
        Object.entries(obj).filter((kv) => typeof kv[1] === "string")
      )
    : {};
}

function parseBody(body: unknown): PostBody | undefined {
  if (typeof body !== "object") {
    return undefined;
  }
  const { amount, frequency, metadata } = body as { [k: string]: unknown };
  if (
    typeof amount !== "number" ||
    amount < MIN_AMOUNT ||
    amount > MAX_AMOUNT
  ) {
    return undefined;
  }
  if (!isFrequency(frequency)) {
    return undefined;
  }
  return { amount, frequency, metadata: stringObject(metadata) };
}

function session_args(
  origin: string,
  amount: number,
  frequency: Frequency,
  metadata: { [k: string]: string }
): Stripe.Checkout.SessionCreateParams {
  const payment_method_types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    ["card"];
  const success_url = `${origin}/result?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${origin}/cancel`;
  if (frequency === "monthly") {
    return {
      mode: "subscription",
      payment_method_types,
      success_url,
      cancel_url,
      subscription_data: {
        items: [{ plan: MONTHLY_PLAN_ID, quantity: amount }],
        metadata,
      },
    };
  } else {
    return {
      mode: "payment",
      payment_method_types,
      success_url,
      cancel_url,
      line_items: [
        {
          amount,
          currency: "USD",
          name: "One-time donation",
          quantity: 1,
        },
      ],
      submit_type: "donate",
      payment_intent_data: { description: "Donation", metadata },
    };
  }
}

const handler: NextApiHandler = async (req, res) => {
  if (req.method === "POST") {
    try {
      const body = parseBody(req.body);
      if (body === undefined) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      const { amount, frequency, metadata } = body;
      const origin = getOrigin(req.headers.origin);
      // Create Checkout Sessions from body params.
      const checkoutSession: Stripe.Checkout.Session =
        await stripe.checkout.sessions.create(
          session_args(origin, amount, frequency, {
            ...metadata,
            origin,
            app: APP,
          })
        );

      res.status(200).json({ sessionId: checkoutSession.id });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ statusCode: 500, message: (err as Error).message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

export default handler;
