import * as React from "react";
import { StripeSessionInfo } from "src/stripeSessionInfo";
import usdFormatter from "src/usdFormatter";
import { DONATE_EMAIL } from "src/emails";
import ReceiptPhotos from "./ReceiptPhotos";
import { LongDateFormat } from "src/dates";
import { PHONE_NUMBER, EIN, MAILING_ADDRESS } from "src/orgInfo";
import styles from "./DonateResult.module.scss";
import clsx from "clsx";

const DonateResult: React.FC<{ sessionInfo: StripeSessionInfo }> = ({
  sessionInfo,
}) => {
  const {
    amount,
    name,
    email,
    frequency,
    payment_method,
    created,
    id,
    subscriptionId,
  } = sessionInfo;
  return (
    <main id="main" className={clsx(styles.root, "px-container")}>
      <ReceiptPhotos className={styles.photos} />
      <div className={styles.receipt}>
        <h1 className={styles.heading}>Thank you</h1>
        <p>
          Dear {name},<br />
          <br />
          We want to thank you for your generosity! You are a true champion of
          this work. We look forward to our continued growth and success here at
          Mission Bit.
          <br />
          <br />
          Best,
          <br />
          <br />
          Christina Ortega
          <br />
          CEO, Mission Bit
        </p>
        <h2 className={styles.subHeading}>Donation receipt</h2>
        <dl className={styles.dl}>
          <dt>Donor Name</dt>
          <dd>{name}</dd>
          <dt>Donor Email</dt>
          <dd>{email}</dd>
          <dt>Contribution ({frequency})</dt>
          <dd>{usdFormatter.format(amount / 100)} USD</dd>
          <dt>Payment Method</dt>
          <dd>{payment_method}</dd>
          <dt>Charge Date</dt>
          <dd>{LongDateFormat.format(created * 1000)}</dd>
          {subscriptionId ? (
            <>
              <dt>Subscription ID</dt>
              <dd>
                <a href={`/subscriptions/${subscriptionId}`}>
                  {subscriptionId}
                </a>
              </dd>
            </>
          ) : null}
          <dt>Transaction ID</dt>
          <dd>{id}</dd>
        </dl>
        <address className={styles.orgInfo}>
          Mission Bit
          <br />
          Tax ID: {EIN}
          <br />
          {MAILING_ADDRESS}
          <br />
          {PHONE_NUMBER}
          <br />
          <a
            href={`mailto:${DONATE_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {DONATE_EMAIL}
          </a>
          <br />
        </address>
        <p className={styles.body}>
          Mission Bit is a 501(c)(3) nonprofit organization. Your contribution
          is tax-deductible to the extent allowed by law. No goods or services
          were provided in exchange for your generous financial donation. Thank
          you.
        </p>
      </div>
    </main>
  );
};

export default DonateResult;
