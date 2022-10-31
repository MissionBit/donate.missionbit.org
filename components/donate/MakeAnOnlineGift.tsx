import * as React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import clsx from "clsx";
import DonateCard, { DonatePrefill } from "./DonateCard";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const useStyles = makeStyles((theme) => ({
  root: {
    [theme.breakpoints.up("md")]: {
      paddingTop: theme.spacing(4),
    },
  },
  donateCard: {},
  supportSummary: {
    [theme.breakpoints.up("md")]: {
      display: "none",
    },
    padding: theme.spacing(2),
    textAlign: "center",
  },
}));

async function loadStripePromise() {
  const stripePublishableKey = process.env.STRIPE_PK;
  if (stripePublishableKey === undefined) {
    throw new Error(
      `Missing STRIPE_PK${
        process.env.STRIPE_KEY_POSTFIX ?? ""
      } configuration for Stripe`
    );
  }
  return await loadStripe(stripePublishableKey);
}

const stripePromise = loadStripePromise();

export const MakeAnOnlineGift: React.FC<{
  className?: string;
  prefill?: DonatePrefill;
}> = ({ className, prefill }) => {
  const classes = useStyles();
  return (
    <Box component="section" className={clsx(classes.root, className)}>
      <Elements stripe={stripePromise}>
        <DonateCard className={classes.donateCard} prefill={prefill} />
      </Elements>
    </Box>
  );
};

export default MakeAnOnlineGift;
