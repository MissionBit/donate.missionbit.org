import * as React from "react";
import { useStripe } from "@stripe/react-stripe-js";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import IndigoButton from "components/IndigoButton";
import ArrowRightIcon from "components/icons/ArrowRightIcon";
import {
  parseCents,
  Frequency,
  FREQUENCIES,
  trackCheckoutEvent,
} from "src/stripeHelpers";
import { Stripe } from "@stripe/stripe-js";
import dollars from "src/dollars";
import styles from "./DonateCard.module.scss";
import Checkbox from "./Checkbox";
import { RadioGroup } from "@headlessui/react";
import InputAmount from "./InputAmount";
import { formatCents } from "./formatCents";
import { DonatePrefill, DEFAULT_PREFILL } from "./parseDonatePrefill";

const matchEnd = Date.parse("2021-08-01T00:00:00-07:00");

async function checkoutDonation(
  stripe: Stripe,
  amount: number,
  frequency: Frequency,
  metadata: { [k: string]: string } = {},
) {
  trackCheckoutEvent(amount, frequency, "Stripe Checkout");
  const response = await fetch("/api/checkout-sessions", {
    method: "POST",
    body: JSON.stringify({
      amount,
      frequency,
      metadata,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Could not connect to server, please try again.");
  }
  const json = await response.json();
  const result = await stripe.redirectToCheckout(json);
  throw new Error(result.error.message);
}

export const DonateCard: React.FC<{
  className?: string;
  prefill?: DonatePrefill | undefined;
}> = ({ className, prefill = DEFAULT_PREFILL }) => {
  const stripe = useStripe();
  const [frequency, setFrequency] = useState<Frequency>(prefill.frequency);
  const [amountString, setAmountString] = useState<string>(
    prefill.amount || (prefill.presetAmounts[0] * 0.01).toString(),
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [coverFees, setCoverFees] = useState<boolean>(true);
  const [optIn, setOptIn] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const amountCents = parseCents(amountString);
  const disabled = stripe === null || loading || (amountCents ?? 0) <= 0;
  const handleFrequency = useCallback((newFrequency: unknown) => {
    if (FREQUENCIES.indexOf(newFrequency as Frequency) >= 0) {
      setFrequency(newFrequency as Frequency);
    }
  }, []);
  const handleAmountCents = useCallback((newAmountCents: number) => {
    if (newAmountCents) {
      setAmountString(formatCents(newAmountCents));
    }
  }, []);
  const handleChangeAmount = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAmountString(event.currentTarget.value);
    },
    [],
  );
  const handleOnSubmit: React.FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (disabled || stripe === null || amountCents === null) {
        return;
      }
      try {
        setLoading(true);
        await checkoutDonation(stripe, amountCents, frequency, {
          ...(optIn ? { optIn: "optIn" } : {}),
          ...(coverFees ? { coverFees: "coverFees" } : {}),
          ...(anonymous ? { anonymous: "anonymous" } : {}),
        });
      } catch (err) {
        setLoading(false);
        console.error(err);
        setErrorMessage((err as Error).message);
      }
    },
    [disabled, stripe, amountCents, frequency, optIn, coverFees, anonymous],
  );
  const [matchAvailable, setMatchAvailable] = useState(false);
  useEffect(() => setMatchAvailable(() => Date.now() < matchEnd), []);

  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.heading}>Donate Online</div>
      <div className={styles.content}>
        {/* todo add Collapse animation */}
        {matchAvailable ? (
          <div className={clsx(styles.inputTextSize, styles.match)}>
            <span role="img" aria-label="Party popper">
              🎉
            </span>
            <span className={styles.matchCopy}>
              Online donations today will be matched up to $10k!
            </span>
            <span role="img" aria-label="Party popper">
              🎉
            </span>
          </div>
        ) : null}
        <form className={styles.form} onSubmit={handleOnSubmit}>
          <RadioGroup
            value={frequency}
            onChange={handleFrequency}
            aria-label="Donation frequency"
            className={styles.frequency}
          >
            <RadioGroup.Option value="one-time">One-time</RadioGroup.Option>
            <RadioGroup.Option value="monthly">Monthly</RadioGroup.Option>
          </RadioGroup>
          <RadioGroup
            value={amountCents}
            onChange={handleAmountCents}
            aria-label="Preset donation amounts"
            className={styles.amounts}
          >
            {prefill.presetAmounts.map((cents) => (
              <RadioGroup.Option key={cents} value={cents}>
                {dollars(cents)}
              </RadioGroup.Option>
            ))}
          </RadioGroup>
          <InputAmount
            id="input-amount"
            name="Amount"
            value={amountString}
            onChange={handleChangeAmount}
            className={clsx(styles.inputTextSize, styles.fullWidth)}
          />
          <Checkbox
            id="anonymous-checkbox"
            checked={anonymous}
            onChange={setAnonymous}
          >
            Show my name as "Anonymous"
            <span className={styles.toThePublic}> to the public</span>
          </Checkbox>
          <Checkbox
            id="cover-fees-checkbox"
            checked={coverFees}
            onChange={setCoverFees}
          >
            Add 3% to help cover payment processing fees
          </Checkbox>
          <Checkbox id="opt-in-checkbox" checked={optIn} onChange={setOptIn}>
            Allow Mission Bit to contact me after this donation
          </Checkbox>
          {errorMessage ? (
            <span className={clsx(styles.error, styles.fullWidth)}>
              {errorMessage}
            </span>
          ) : null}
          <IndigoButton
            disabled={disabled}
            type="submit"
            className={styles.button}
          >
            Donate with card <ArrowRightIcon className={styles.arrowIcon} />
          </IndigoButton>
        </form>
      </div>
      <div className={styles.disclaimer}>
        All donations are tax-deductible to the extent allowed by IRS guidelines
      </div>
    </div>
  );
};

export default DonateCard;
