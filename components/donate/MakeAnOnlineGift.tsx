import * as React from "react";
import DonateCard from "./DonateCard";
import { DonatePrefill } from "./parseDonatePrefill";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

async function loadStripePromise() {
  const stripePublishableKey = process.env.STRIPE_PK;
  if (stripePublishableKey === undefined) {
    throw new Error(
      `Missing STRIPE_PK${
        process.env.STRIPE_KEY_POSTFIX ?? ""
      } configuration for Stripe`,
    );
  }
  return await loadStripe(stripePublishableKey);
}

const stripePromise = loadStripePromise();

export const MakeAnOnlineGift: React.FC<{
  className?: string;
  prefill?: DonatePrefill;
}> = ({ className, prefill }) => {
  return (
    <section className={className}>
      <Elements stripe={stripePromise}>
        <DonateCard prefill={prefill} />
      </Elements>
    </section>
  );
};

export default MakeAnOnlineGift;
