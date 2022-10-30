import * as React from "react";
import Head from "next/head";
import { makeStyles } from "@material-ui/core/styles";

const WEIGHTS = [
  { weight: 400, name: "Regular" },
  { weight: 500, name: "SemiBold" },
  { weight: 700, name: "Bold" },
] as const;

const useStyles = makeStyles({
  "@global": {
    "@font-face": WEIGHTS.map(({ name, weight }) => ({
      src: [
        `url("/fonts/Montserrat-${name}.woff2") format("woff2")`,
        `url("/fonts/Montserrat-${name}.woff") format("woff")`,
      ].join(","),
      fontFamily: "Montserrat",
      fontStyle: "normal",
      fontDisplay: "swap",
      fontWeight: weight,
    })),
  },
});

export default function Montserrat(): JSX.Element {
  useStyles();
  return (
    <Head>
      {WEIGHTS.map(({ name }) => (
        <link
          key={name}
          rel="preload"
          href={`/fonts/Montserrat-${name}.woff2`}
          as="font"
          crossOrigin=""
        />
      ))}
    </Head>
  );
}
