import Stripe from "stripe";
import getStripe from "src/getStripe";
import { Frequency, FREQUENCIES } from "src/stripeHelpers";
import { getOrigin } from "src/absoluteUrl";
import { APP } from "src/stripeMetadata";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const MONTHLY_PLAN_ID = "mb-monthly-001";
const MONTHLY_COVER_FEES_PLAN_ID = "mb-monthly-fees-001";

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
        Object.entries(obj).filter((kv) => typeof kv[1] === "string"),
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

function lineItem(name: string, unit_amount: number) {
  return {
    price_data: {
      unit_amount,
      currency: "USD",
      product_data: {
        name,
      },
    },
    quantity: 1,
  };
}

async function session_args(
  stripe: Stripe,
  origin: string,
  amount: number,
  frequency: Frequency,
  metadata: { [k: string]: string },
): Promise<Stripe.Checkout.SessionCreateParams> {
  const payment_method_types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    ["card"];
  const success_url = `${origin}/result?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${origin}/`;
  const coverFees =
    metadata.coverFees === "coverFees" ? Math.ceil(amount * 0.03) : 0;
  if (frequency === "monthly") {
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
    });
    let monthlyId = MONTHLY_PLAN_ID;
    let monthlyCoverFeesId = MONTHLY_COVER_FEES_PLAN_ID;
    for (const { lookup_key, id } of prices.data) {
      if (lookup_key === MONTHLY_PLAN_ID) {
        monthlyId = id;
      } else if (lookup_key === MONTHLY_COVER_FEES_PLAN_ID) {
        monthlyCoverFeesId = id;
      }
    }
    return {
      mode: "subscription",
      payment_method_types,
      success_url,
      cancel_url,
      subscription_data: {
        metadata,
      },
      line_items: [
        { price: monthlyId, quantity: amount },
        ...(coverFees > 0
          ? [{ price: monthlyCoverFeesId, quantity: coverFees }]
          : []),
      ],
    };
  } else {
    return {
      mode: "payment",
      payment_method_types,
      success_url,
      cancel_url,
      line_items: [
        lineItem("One-time donation", amount),
        ...(coverFees > 0
          ? [lineItem("Cover processing fees (3%)", coverFees)]
          : []),
      ],
      submit_type: "donate",
      payment_intent_data: { description: "Donation", metadata },
    };
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();

  try {
    const body = parseBody(await req.json());
    if (body === undefined) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { amount, frequency, metadata } = body;
    const origin = getOrigin(req.headers.get("origin") ?? undefined);
    // Create Checkout Sessions from body params.
    const checkoutSession: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create(
        await session_args(stripe, origin, amount, frequency, {
          ...metadata,
          origin,
          app: APP,
        }),
      );
    return Response.json({ sessionId: checkoutSession.id });
  } catch (err) {
    console.error(err);
    return Response.json(
      { statusCode: 500, message: (err as Error).message },
      { status: 500 },
    );
  }
}
