import { Metadata } from "next";
import * as React from "react";
import DonateResult from "components/donate/DonateResult";
import stripeSessionInfo from "src/stripeSessionInfo";
import { notFound } from "next/navigation";
import getStripe from "src/getStripe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Mission Bit – Thank You For Your Donation!",
};
export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function ResultPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { session_id } = searchParams ?? {};
  if (typeof session_id !== "string") {
    return notFound();
  }
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: [
      "customer",
      "payment_intent",
      "payment_intent.latest_charge",
      "subscription.latest_invoice.charge",
    ],
  });
  const sessionInfo = stripeSessionInfo(session);
  if (sessionInfo === undefined) {
    return notFound();
  }
  return <DonateResult sessionInfo={sessionInfo} />;
}
