import React from "react";
import { getLiveProps } from "app/getLiveProps";
import { notFound } from "next/navigation";
import LiveDashboard from "components/donate/LiveDashboard";

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
