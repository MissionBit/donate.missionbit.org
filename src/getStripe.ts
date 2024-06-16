import Stripe from "stripe";
import getStripeKey from "./getStripeKey";

let stripe: Stripe | undefined;
export function getStripe(): Stripe {
  if (stripe === undefined) {
    stripe = new Stripe(getStripeKey("STRIPE_SK"), {
      // https://github.com/stripe/stripe-node#configuration
      apiVersion: "2024-04-10",
      maxNetworkRetries: 3,
    });
  }
  return stripe;
}

export default getStripe;
