"use client";
import * as React from "react";
import Link from "next/link";
import Landing from "./Landing";
import { DONATE_EMAIL } from "src/emails";

const DonateCancel: React.FC<Record<never, never>> = () => {
  return (
    <main id="main">
      <Landing />
      <div className="px-container">
        <h1>Donation canceled</h1>
        <p className="large">
          Your donation has been canceled. If you have any questions about
          donations, contact us at{" "}
          <a
            href={`mailto:${DONATE_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {DONATE_EMAIL}
          </a>
          .
        </p>
        <p className="large">
          <Link href="/">Back to the donate page</Link>
        </p>
      </div>
    </main>
  );
};

export default DonateCancel;
