import * as React from "react";
import { withStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import { useStripe } from "@stripe/react-stripe-js";
import clsx from "clsx";
import { ssBrand } from "src/colors";
import BaseOutlinedInput from "@material-ui/core/OutlinedInput";
import FormControl from "@material-ui/core/FormControl";
import BaseInputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import { useCallback, useEffect, useState } from "react";
import IndigoButton from "components/IndigoButton";
import ArrowRightIcon from "components/icons/ArrowRightIcon";
import {
  parseCents,
  Frequency,
  FREQUENCIES,
  trackCheckoutEvent,
  isFrequency,
} from "src/stripeHelpers";
import { Stripe } from "@stripe/stripe-js";
import { Typography, Collapse } from "@material-ui/core";
import dollars from "src/dollars";
import styles from "./DonateCard.module.scss";
import Checkbox from "./Checkbox";
import { RadioGroup } from "@headlessui/react";

const matchEnd = Date.parse("2021-08-01T00:00:00-07:00");

const brandColor = ssBrand.purple;
const borderColor = brandColor;

const InputLabel = withStyles({
  root: {
    "&$focused": {
      color: brandColor,
    },
  },
  focused: {},
})(BaseInputLabel);

const OutlinedInput = withStyles((theme) => ({
  root: {
    "&:hover $notchedOutline": {
      borderColor: brandColor,
    },
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      "&:hover $notchedOutline": {
        borderColor: brandColor,
      },
    },
    "&$focused $notchedOutline": {
      borderColor: brandColor,
    },
    "&$error $notchedOutline": {
      borderColor: theme.palette.error.main,
    },
    "&$disabled $notchedOutline": {
      borderColor: theme.palette.action.disabled,
    },
  },
  focused: {},
  error: {},
  disabled: {},
  notchedOutline: {
    borderColor,
  },
}))(BaseOutlinedInput);

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

function formatCents(cents: number): string {
  return Math.floor(cents / 100).toFixed(0);
}

export interface DonatePrefill {
  frequency: Frequency;
  amount: string;
  presetAmounts: readonly number[];
}

export const DEFAULT_PREFILL: DonatePrefill = {
  frequency: "one-time",
  amount: "",
  presetAmounts: [25000, 10000, 5000],
};

export function parseDonatePrefill(obj: {
  frequency?: unknown;
  dollars?: unknown;
}): DonatePrefill {
  const { frequency, dollars } = obj;
  const rval = { ...DEFAULT_PREFILL };
  if (typeof frequency === "string" && isFrequency(frequency)) {
    rval.frequency = frequency;
  }
  if (typeof dollars === "string") {
    const cents = parseCents(dollars);
    if (cents) {
      rval.amount = formatCents(cents);
    }
  }
  return rval;
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
  const handleFrequency = useCallback((newFrequency) => {
    if (FREQUENCIES.indexOf(newFrequency) >= 0) {
      setFrequency(newFrequency);
    }
  }, []);
  const handleAmountCents = useCallback((newAmountCents) => {
    if (newAmountCents) {
      setAmountString(formatCents(newAmountCents));
    }
  }, []);
  const handleChangeAmount = useCallback((event) => {
    setAmountString(event.currentTarget.value);
  }, []);
  const handleOnSubmit = useCallback(
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
        <Collapse in={matchAvailable}>
          <Box className={clsx(styles.inputTextSize, styles.match)}>
            <span role="img" aria-label="Party popper">
              🎉
            </span>
            <span className={styles.matchCopy}>
              Online donations today will be matched up to $10k!
            </span>
            <span role="img" aria-label="Party popper">
              🎉
            </span>
          </Box>
        </Collapse>
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
          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
            <OutlinedInput
              id="outlined-adornment-amount"
              value={amountString}
              onChange={handleChangeAmount}
              className={styles.inputTextSize}
              startAdornment={
                <InputAdornment position="start">
                  <Typography
                    color="textSecondary"
                    className={styles.inputTextSize}
                  >
                    $
                  </Typography>
                </InputAdornment>
              }
              labelWidth={60}
            />
          </FormControl>
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
          {errorMessage ? <Typography>{errorMessage}</Typography> : null}
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
