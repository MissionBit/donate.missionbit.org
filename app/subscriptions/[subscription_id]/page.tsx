import { Metadata } from "next";
import * as React from "react";
import DonateSubscription, {
  DonateSubscriptionProps,
} from "components/donate/DonateSubscription";
import {
  billingDetailsTo,
  formatPaymentMethodDetailsSource,
} from "src/stripeSessionInfo";
import { LongDateFormat } from "src/dates";
import getStripe from "src/getStripe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Mission Bit – Manage Your Subscription",
};
export const dynamic = "force-dynamic";
export const runtime = "edge";

function ensureString(x: unknown, context: string): string {
  if (typeof x !== "string") {
    throw new Error(`Expecting string, not ${typeof x} for ${context}`);
  }
  return x;
}

export default async function Page({
  params: { subscription_id },
}: {
  params: { subscription_id: string };
}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscription_id, {
    expand: ["default_payment_method"],
  });
  const items = subscription.items.data;
  if (items.length < 1) {
    throw new Error(
      `Expecting at least one subscription item ${JSON.stringify(
        subscription,
      )}`,
    );
  }
  let amount = 0;
  for (const item of items) {
    if (
      typeof item.plan.amount !== "number" ||
      typeof item.quantity !== "number"
    ) {
      throw new Error(
        `Expecting non-null subscription amount and quantity ${JSON.stringify(
          subscription,
        )}`,
      );
    }
    amount += item.plan.amount * item.quantity;
  }
  const pm = subscription.default_payment_method;
  if (typeof pm !== "object" || pm === null) {
    throw new Error(
      `Expecting non-null default_payment_method ${JSON.stringify(
        subscription,
      )}`,
    );
  }
  const nextCycle =
    subscription.status === "active"
      ? LongDateFormat.format(subscription.current_period_end * 1000)
      : null;

  const { data: invoices } = await stripe.invoices.list({
    subscription: subscription.id,
    limit: 60,
    status: "paid",
  });

  const subscriptionInfo = {
    ...billingDetailsTo(pm.billing_details),
    paidInvoices: invoices.map((invoice) => ({
      created: invoice.created,
      amount: invoice.amount_paid,
      id: ensureString(invoice.charge, "invoice.charge"),
    })),
    id: subscription.id,
    frequency: "monthly",
    amount,
    paymentMethod: formatPaymentMethodDetailsSource(pm),
    nextCycle,
  } satisfies DonateSubscriptionProps;
  return <DonateSubscription {...subscriptionInfo} />;
}
