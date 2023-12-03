"use client";
import * as React from "react";
import Router from "next/router";
import smoothscroll from "smoothscroll-polyfill";
import { pageview } from "components/GoogleAnalytics";
import * as Sentry from "@sentry/browser";
import { BuildTimeContext } from "components/BuildTimeContext";

if (typeof window !== "undefined") {
  smoothscroll.polyfill();
  Sentry.init({
    enabled: process.env.NODE_ENV === "production",
    dsn: "https://8551b8e3da8146a080790b4d8e46e8b5@o404841.ingest.sentry.io/4503973024038912",
    tracesSampleRate: 1.0,
  });
  Router.events.on("routeChangeComplete", pageview);
}

export default function ClientLayout({
  children,
  buildTime,
}: React.PropsWithChildren<{ buildTime: number }>) {
  return (
    <BuildTimeContext.Provider value={buildTime}>
      {children}
    </BuildTimeContext.Provider>
  );
}
