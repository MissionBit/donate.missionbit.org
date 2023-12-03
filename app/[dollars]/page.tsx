import * as React from "react";
import Donate from "components/donate";
import { getLiveProps } from "app/getLiveProps";
export { metadata } from "../page";

export default async function Page({
  params: { dollars },
  searchParams,
}: {
  params: { dollars: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { batch, modifications, prefill, buildTime } = await getLiveProps({
    dollars,
    ...searchParams,
  });
  return (
    <Donate
      buildTime={buildTime}
      campaign={batch && modifications ? { batch, modifications } : undefined}
      prefill={prefill}
    />
  );
}
