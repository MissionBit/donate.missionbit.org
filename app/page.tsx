import { Metadata } from "next";
import * as React from "react";
import Donate from "components/donate";
import { getLiveProps } from "./getLiveProps";

const title = "Donate Today - Mission Bit";
const description =
  "Donate and support San Francisco area 501c3 Mission Bit today with a tax-deductible donation.";
const canonical = "/";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
  },
};
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { batch, modifications, prefill, buildTime } =
    await getLiveProps(searchParams);
  return (
    <Donate
      buildTime={buildTime}
      campaign={batch && modifications ? { batch, modifications } : undefined}
      prefill={prefill}
    />
  );
}
