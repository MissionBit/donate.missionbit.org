import dotenv from "dotenv";
dotenv.config();

import * as salesforce from "src/salesforce";
import { getStripe } from "src/getStripe";
import dollars from "src/dollars";

async function main(): Promise<void> {
  const IMPORT_BEGIN_DATE = process.env.IMPORT_BEGIN_DATE ?? "2022-11-01";
  if (process.env.STRIPE_KEY_POSTFIX !== "_LIVE") {
    throw new Error("Expecting _LIVE Stripe key");
  }
  const stripe = getStripe();
  const client = await salesforce.login();
  for await (const row of stripe.charges.list({
    created: {
      gte: new Date(IMPORT_BEGIN_DATE).getTime() / 1000,
    },
  })) {
    if (row.status === "succeeded") {
      console.log(
        `Importing charge ${row.id} ${row.status} ${dollars(
          row.amount
        )} ${new Date(row.created * 1000).toISOString()} ${
          row.billing_details.email
        }`
      );
      await salesforce.stripeChargeSync(client, row.id);
    }
  }
  // for await (const row of stripe.invoices.list({
  //   collection_method: "charge_automatically",
  //   status: "paid",
  //   created: {
  //     gte: new Date(IMPORT_BEGIN_DATE).getTime() / 1000,
  //     lt: new Date("2022-11-07").getTime() / 1000,
  //   },
  // })) {
  //   console.log(
  //     `Importing invoice ${row.id} ${row.status} ${new Date(
  //       row.created * 1000
  //     ).toISOString()}`
  //   );
  //   await salesforce.stripeInvoicePaymentSync(client, row.id);
  // }

  // for await (const row of stripe.checkout.sessions.list({
  //   expand: ["data.payment_intent"],
  // })) {
  //   if (row.payment_intent && typeof row.payment_intent === "object") {
  //     const created = new Date(row.payment_intent.created * 1000).toISOString();
  //     console.log(`Importing session ${row.id} ${row.status} ${created}`);
  //     if (created < IMPORT_BEGIN_DATE) {
  //       console.log(`Import complete at ${IMPORT_BEGIN_DATE}`);
  //       break;
  //     }
  //     if (
  //       row.payment_intent.status === "succeeded" &&
  //       row.status === "complete"
  //     ) {
  //       await salesforce.stripeCheckoutSessionCompletedPaymentSync(
  //         client,
  //         row.id
  //       );
  //     }
  //   }
  // }
}
main();
