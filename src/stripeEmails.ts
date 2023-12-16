import Stripe from "stripe";
import getStripe from "src/getStripe";
import {
  formatPaymentMethodDetailsSource,
  billingDetailsTo,
} from "src/stripeSessionInfo";
import { getSendGrid, MailDataRequired } from "src/getSendgrid";
import { DONATE_EMAIL } from "src/emails";
import usdFormatter from "src/usdFormatter";
import { Frequency } from "src/stripeHelpers";
import { ShortDateFormat, LongDateFormat } from "src/dates";
import { getOrigin } from "src/absoluteUrl";
import { APP } from "./stripeMetadata";

const EMAIL_TEMPLATES = {
  receipt: "d-7e5e6a89f9284d2ab01d6c1e27a180f8",
  failure: "d-570b4b8b20e74ec5a9c55be7e07e2665",
};

function donorName(billing_details: {
  readonly name: string;
  readonly email: string;
}): string {
  if (!billing_details.email) {
    throw new Error(
      `Expecting non-null email ${JSON.stringify(billing_details)}`,
    );
  }
  return billing_details.name
    ? `${billing_details.name} <${billing_details.email}>`
    : billing_details.email;
}

interface EmailTemplateData {
  template: keyof typeof EMAIL_TEMPLATES;
  charge: Stripe.Charge;
  frequency: Frequency;
  monthly?: {
    next: string;
    url: string;
  };
  failure_message?: string | null;
  renew_url?: string;
  subscription_id?: string;
  subscription_url?: string;
  name: string;
  email: string;
}

async function sendEmail(templateData: EmailTemplateData) {
  const mailData = emailTemplateData(templateData);
  const { email } = templateData;
  console.log(
    `Sending ${templateData.frequency} ${templateData.template} for ${templateData.charge.id} to ${email}`,
  );
  const result = await getSendGrid().send(mailData);
  console.log(`Mail statusCode: ${result[0].status} for ${email}`);
  return result;
}

export function emailTemplateData({
  template,
  charge,
  frequency,
  ...extra
}: EmailTemplateData): MailDataRequired {
  if (!charge?.payment_method_details) {
    throw new Error(
      `Expecting charge to have payment_method_details ${JSON.stringify(
        charge,
      )}`,
    );
  }
  const payment_method = formatPaymentMethodDetailsSource(
    charge.payment_method_details,
  );
  const { name, email } = extra;
  const toAddress = { name, email };
  return {
    template_id: EMAIL_TEMPLATES[template],
    from: { name: "Mission Bit", email: DONATE_EMAIL },
    personalizations: [
      {
        to: [toAddress],
        dynamic_template_data: {
          transaction_id: charge.id,
          frequency,
          total: usdFormatter.format(charge.amount / 100),
          date: ShortDateFormat.format(charge.created * 1000),
          payment_method: payment_method,
          donor: donorName(toAddress),
          ...extra,
        },
      },
    ],
  };
}

export async function fetchSessionPaymentIntent(
  sessionId: string,
): Promise<Stripe.PaymentIntent> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge"],
  });
  if (session.mode !== "payment") {
    throw new Error(`Expecting session.mode === "payment"`);
  }

  const payment_intent = session.payment_intent;
  if (!payment_intent || typeof payment_intent !== "object") {
    throw new Error(
      `Expecting expanded payment_intent: ${JSON.stringify(payment_intent)}`,
    );
  }
  return payment_intent;
}

export async function stripeCheckoutSessionCompletedPaymentEmail(
  id: string,
): Promise<void> {
  const payment_intent = await fetchSessionPaymentIntent(id);
  const appMetadata = payment_intent.metadata?.app ?? null;
  if (appMetadata !== APP) {
    console.log(
      `Skipping checkout session ${id} with payment_intent.metadata ${JSON.stringify(
        payment_intent.metadata,
      )}`,
    );
    return;
  }
  const charge = payment_intent.latest_charge;
  if (!charge || typeof charge !== "object") {
    throw new Error(
      `Expecting expanded latest_charge ${JSON.stringify(charge)}`,
    );
  }
  await sendEmail({
    template: "receipt",
    charge,
    frequency: "one-time",
    ...billingDetailsTo(charge.billing_details, charge.metadata.email),
  });
}

export function invoiceTemplate({
  status,
  billing_reason,
}: Stripe.Invoice): "receipt" | "failure" | null {
  if (status === "paid") {
    return "receipt";
  } else if (status === "open" && billing_reason === "subscription_cycle") {
    // No failure email unless it's a renewal, we don't want to send one
    // if they got an error in the Stripe Checkout UX.
    return "failure";
  } else {
    return null;
  }
}

function legacyGetOrigin(origin?: string): string {
  // Update any previously used production origin to donate.missionbit.org,
  // this will allow subscription emails to be routed to the correct place
  return getOrigin(origin).replace(
    /^https:\/\/(www|donate|legacy)\.missionbit\.org$/,
    "https://donate.missionbit.org",
  );
}

export type ExpandedInvoice = Stripe.Response<Stripe.Invoice> & {
  payment_intent: Stripe.PaymentIntent;
  subscription: Stripe.Subscription;
};

export async function fetchInvoiceWithPaymentIntent(
  invoiceId: string,
): Promise<ExpandedInvoice> {
  const invoice = await getStripe().invoices.retrieve(invoiceId, {
    expand: ["subscription", "payment_intent", "payment_intent.latest_charge"],
  });
  if (
    typeof invoice.subscription !== "object" ||
    invoice.subscription === null
  ) {
    throw new Error(
      `Expecting expanded subcription ${JSON.stringify(invoice.subscription)}`,
    );
  }
  if (
    typeof invoice.payment_intent !== "object" ||
    invoice.payment_intent === null
  ) {
    throw new Error(
      `Expecting expanded payment_intent ${JSON.stringify(invoice)}`,
    );
  }
  return invoice as ExpandedInvoice;
}

function getSubscriptionOrigin({
  metadata,
}: Stripe.Subscription): string | undefined {
  if (metadata.origin || metadata["Donation Post ID"]) {
    return "https://donate.missionbit.org";
  }
}

export async function stripeInvoicePaymentEmailData(
  id: string,
): Promise<EmailTemplateData | undefined> {
  const invoice = await fetchInvoiceWithPaymentIntent(id);
  const template = invoiceTemplate(invoice);
  if (template === null) {
    console.log(
      `Skipping invoice ${invoice.id} with billing_reason ${invoice.billing_reason} and status ${invoice.status}`,
    );
    return;
  }
  const { subscription } = invoice;
  const subscriptionOrigin = getSubscriptionOrigin(subscription);
  if (!subscriptionOrigin) {
    console.log(
      `Skipping invoice ${invoice.id} with missing subscription origin`,
    );
    return;
  }
  const charge = invoice.payment_intent.latest_charge;
  if (!charge || typeof charge !== "object") {
    throw new Error(
      `Expecting expanded latest_charge ${JSON.stringify(charge)}`,
    );
  }
  const origin = legacyGetOrigin(subscriptionOrigin);
  const { name, email } = billingDetailsTo(
    charge.billing_details,
    invoice.customer_email,
  );
  if (template === "failure") {
    return {
      template,
      charge,
      frequency: "monthly",
      failure_message: charge.failure_message,
      renew_url: `${origin}/${usdFormatter.format(
        charge.amount / 100,
      )}?frequency=monthly`,
      subscription_id: subscription.id,
      subscription_url: `${origin}/subscriptions/${subscription.id}`,
      name,
      email,
    };
  } else {
    const next = LongDateFormat.format(subscription.current_period_end * 1000);
    return {
      template,
      charge,
      frequency: "monthly",
      monthly: {
        next,
        url: `${origin}/subscriptions/${subscription.id}`,
      },
      name,
      email,
    };
  }
}

export async function stripeInvoicePaymentEmail(id: string): Promise<void> {
  const body = await stripeInvoicePaymentEmailData(id);
  if (body) {
    await sendEmail(body);
  }
}
