import React from "react";
import { getLiveProps } from "app/getLiveProps";
import { notFound } from "next/navigation";
import LiveDashboard from "components/donate/LiveDashboard";

import { metadata as pageMetadata } from "../page";
import { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMetadata,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { batch, modifications } = await getLiveProps(searchParams);
  if (batch === undefined || modifications === undefined) {
    return notFound();
  }
  return (
    <LiveDashboard
      batch={batch}
      modifications={modifications}
      simulate={process.env.NODE_ENV === "development"}
    />
  );
}
