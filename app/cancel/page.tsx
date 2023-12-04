import { Metadata } from "next";
import * as React from "react";
import DonateCancel from "components/donate/DonateCancel";

export const metadata: Metadata = {
  title: "Mission Bit – Donation Canceled",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DonateCancel />;
}
