import { argv } from "process";
import {
  emailTemplateData,
  stripeInvoicePaymentEmailData,
} from "src/stripeEmails";

async function main() {
  for (const invoiceId of argv.slice(2)) {
    // const invoice = await fetchInvoiceWithPaymentIntent(invoiceId);
    // console.log(JSON.stringify(invoice, null, 2));
    const templateData = await stripeInvoicePaymentEmailData(invoiceId);
    if (!templateData) {
      continue;
    }
    const mailData = emailTemplateData(templateData);
    console.log(JSON.stringify(mailData, null, 2));
  }
}

main();
