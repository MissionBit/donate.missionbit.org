"use client";
import * as React from "react";
import CircularProgress from "./CircularProgress";
import { Dialog } from "@headlessui/react";
import Landing from "./Landing";
import { Frequency } from "src/stripeHelpers";
import { useState, useCallback } from "react";
import usdFormatter from "src/usdFormatter";
import { DONATE_EMAIL } from "src/emails";
import { ShortDateFormat } from "src/dates";
import styles from "./DonateSubscription.module.scss";
import clsx from "clsx";

export interface DonateSubscriptionProps {
  id: string;
  amount: number;
  frequency: Frequency;
  paymentMethod: string;
  nextCycle: string | null;
  name: string;
  email: string;
  paidInvoices: DonateSubscriptionInvoice[];
}

export interface DonateSubscriptionInvoice {
  id: string;
  amount: number;
  created: number;
}

const DonateSubscription: React.FC<DonateSubscriptionProps> = ({
  id,
  amount,
  frequency,
  paymentMethod,
  nextCycle: initialNextCycle,
  name,
  email,
  paidInvoices,
}) => {
  const [nextCycle, setNextCycle] = useState<string | null>(initialNextCycle);
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setOpen(true);
    },
    [],
  );
  const handleClose = useCallback(() => {
    if (!loading) {
      setOpen(false);
    }
  }, [loading]);
  const handleConfirm: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setOpen(true);
      setLoading(true);
      try {
        const result = await fetch("/api/cancel-subscription", {
          method: "POST",
          body: JSON.stringify({ id }),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        if (result.ok) {
          setNextCycle(null);
        }
      } finally {
        setLoading(false);
        setOpen(false);
      }
    },
    [id],
  );
  return (
    <main id="main">
      <Landing />
      <div className={clsx(styles.root, "px-container")}>
        <h1>Manage Your Donation</h1>
        <p className={clsx(styles.info, "large")}>
          Your <strong>{usdFormatter.format(amount / 100)}</strong> {frequency}{" "}
          donation by {paymentMethod} is{" "}
          {nextCycle ? <>active and will renew on {nextCycle}.</> : "canceled."}{" "}
          The email we have on file is:
          <br />
          {email}
          <br />
          <br />
          Name:
          <br />
          {name}
          <br />
          Subscription ID:
          <br />
          {id}
          <br />
          <br />
          If you have any questions about your {frequency} donation, contact us
          at{" "}
          <a
            href={`mailto:${DONATE_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {DONATE_EMAIL}
          </a>
          .
        </p>
        <h2 className={styles.receiptHeading}>Receipts:</h2>
        <ul className={clsx(styles.receipts, "large")}>
          {paidInvoices.map(({ id, amount, created }) => (
            <li key={id}>
              <a href={`/receipts/${id}`}>
                {ShortDateFormat.format(created * 1000)}
              </a>{" "}
              {usdFormatter.format(amount / 100)}
            </li>
          ))}
        </ul>
        {nextCycle ? (
          <form onSubmit={handleSubmit}>
            <p>
              To change your payment method or contribution level, cancel your
              donation and create a new one. If you would like to cancel your
              monthly donation,{" "}
              <button
                type="submit"
                className={styles.cancelLink}
                disabled={loading}
              >
                click here
              </button>
              .
            </p>
            {loading && <CircularProgress />}
          </form>
        ) : null}
      </div>
      <Dialog open={open} onClose={handleClose} className={styles.dialog}>
        <div className={styles.backdrop} />
        <div className={styles.dialogContainer}>
          <Dialog.Panel className={styles.panel}>
            <Dialog.Title>Confirm Cancellation</Dialog.Title>
            <Dialog.Description>
              This will cancel your recurring donation.
            </Dialog.Description>
            <p>
              If you confirm and end your recurring donation now, you will not
              be charged again.
            </p>
            <div className={styles.buttons}>
              <button
                className="btn btn--orange-outline"
                onClick={handleClose}
                disabled={loading}
              >
                Not Now
              </button>
              <button
                className="btn btn--purple"
                onClick={handleConfirm}
                disabled={loading}
              >
                Confirm {loading && <CircularProgress />}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </main>
  );
};

export default DonateSubscription;
