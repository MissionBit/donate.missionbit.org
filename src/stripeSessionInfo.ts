import Stripe from "stripe";
import { capitalizeFirst, Frequency } from "./stripeHelpers";

function sendgridSafeName(name: string): string {
  // The to.name, cc.name, and bcc.name personalizations cannot include either the ; or , characters.
  return name.replace(/([,;]\s*)+/g, " ");
}

export function billingDetailsTo(
  billing_details: Stripe.PaymentMethod.BillingDetails,
  email?: string | null | undefined,
): { name: string; email: string } {
  return {
    name: sendgridSafeName(billing_details.name ?? ""),
    email: billing_details.email || email || "",
  };
}

function formatIdentifier(s: string): string {
  // >>> format_identifier('apple_pay')
  // 'Apple Pay'
  return s.split("_").map(capitalizeFirst).join(" ");
}

const CARD_BRANDS: { [k: string]: string } = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

export function formatPaymentMethodDetailsSource(
  payment_method_details:
    | Stripe.PaymentMethod
    | Stripe.Charge.PaymentMethodDetails,
): string {
  const payment_type = payment_method_details.type;
  switch (payment_type) {
    case "card": {
      const details = payment_method_details[payment_type];
      if (details === undefined) {
        break;
      }
      const parts: string[] = [];
      const brand = details.brand !== null ? CARD_BRANDS[details.brand] : null;
      if (brand) {
        parts.push(brand);
      }
      if (details.funding !== null && details.funding !== "unknown") {
        parts.push(details.funding);
      }
      parts.push("card");
      if (details.wallet) {
        parts.push(`(${formatIdentifier(details.wallet.type)})`);
      }
      return parts.join(" ");
    }
  }
  return formatIdentifier(payment_type);
}

export interface StripeSessionInfo {
  id: string;
  frequency: Frequency;
  amount: number;
  payment_method: string;
  name: string;
  email: string;
  created: number;
  subscriptionId: string | null;
}

function metadataFromChargeOrSession(
  charge: Stripe.Charge | Stripe.Checkout.Session,
): Partial<StripeSessionInfo> {
  const name =
    typeof charge.payment_intent === "object"
      ? charge.payment_intent?.metadata?.name
      : undefined;
  return name ? { name } : {};
}

export function stripeSessionInfoFromCharge(
  charge: Stripe.Charge,
  frequency: Frequency | null = null,
  subscriptionId: string | null = null,
): StripeSessionInfo {
  const { payment_method_details, id, amount, created, customer, invoice } =
    charge;
  if (typeof payment_method_details !== "object" || !payment_method_details) {
    throw new Error(
      `Expected payment_method_details to be expanded ${JSON.stringify(
        charge,
      )}`,
    );
  }
  if (
    typeof invoice === "object" &&
    invoice &&
    typeof invoice.subscription === "string"
  ) {
    subscriptionId = invoice.subscription;
    frequency = "monthly";
  }
  return {
    ...billingDetailsTo(
      charge.billing_details,
      (typeof customer === "object" && customer && "email" in customer
        ? customer.email
        : null) || charge.metadata.email,
    ),
    id,
    frequency: frequency ?? "one-time",
    amount,
    payment_method: formatPaymentMethodDetailsSource(payment_method_details),
    created,
    subscriptionId,
    ...metadataFromChargeOrSession(charge),
  };
}

export function stripeCustomerIdFromCharge(charge: Stripe.Charge): string {
  const { customer } = charge;
  if (!customer) {
    throw new TypeError(`Expecting non-null customer for charge ${charge.id}`);
  }
  return typeof customer === "string" ? customer : customer.id;
}

export function stripeSessionInfo(
  session: Stripe.Checkout.Session,
): StripeSessionInfo {
  switch (session.mode) {
    case "subscription": {
      const { subscription } = session;
      if (typeof subscription !== "object" || !subscription) {
        throw new Error(
          `Expected subscription to be expanded ${JSON.stringify(session)}`,
        );
      }
      const { latest_invoice } = subscription;
      if (typeof latest_invoice !== "object" || !latest_invoice) {
        throw new Error(
          `Expected latest_invoice to be expanded ${JSON.stringify(session)}`,
        );
      }
      const { charge } = latest_invoice;
      if (typeof charge !== "object" || !charge) {
        throw new Error(
          `Expected charge to be present ${JSON.stringify(session)}`,
        );
      }
      return {
        ...stripeSessionInfoFromCharge(charge, "monthly", subscription.id),
        ...metadataFromChargeOrSession(session),
      };
    }
    case "payment": {
      const { payment_intent } = session;
      if (typeof payment_intent !== "object" || !payment_intent) {
        throw new Error(
          `Expected payment_intent to be expanded ${JSON.stringify(session)}`,
        );
      }
      const charge = payment_intent.latest_charge;
      if (typeof charge !== "object" || !charge) {
        throw new Error(
          `Expected charge to be present ${JSON.stringify(session)}`,
        );
      }
      return {
        ...stripeSessionInfoFromCharge(charge),
        ...metadataFromChargeOrSession(session),
      };
    }
    default: {
      throw new Error(`Unsupported session type ${JSON.stringify(session)}`);
    }
  }
}

export default stripeSessionInfo;
