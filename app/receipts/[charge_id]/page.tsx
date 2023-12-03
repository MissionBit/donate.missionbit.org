import { Metadata } from "next";
import * as React from "react";
import DonateResult from "components/donate/DonateResult";
import { stripeSessionInfoFromCharge } from "src/stripeSessionInfo";
import { notFound } from "next/navigation";
import getStripe from "src/getStripe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Mission Bit – Thank You For Your Donation!",
};

export default async function ResultPage({
  params: { charge_id },
}: {
  params: { charge_id: string };
}) {
  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(charge_id, {
    expand: ["customer", "payment_intent"],
  });
  if (charge.status === "failed") {
    return notFound();
  }
  const sessionInfo = stripeSessionInfoFromCharge(charge);
  return <DonateResult sessionInfo={sessionInfo} />;
}
