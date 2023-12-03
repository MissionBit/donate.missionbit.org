import * as React from "react";
import styles from "./not-found.module.scss";
import clsx from "clsx";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission Bit – 404 Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className={clsx("px-container", styles.root)}>
      <h1>HTTP 404 Not Found</h1>
      <p>
        Oh no! The link you were looking for doesn't appear to be here anymore.
      </p>
      <h3>
        <a href="https://missionbit.org/">Check out our homepage</a>
      </h3>
    </main>
  );
}
