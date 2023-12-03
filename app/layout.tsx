import * as React from "react";
import localFont from "next/font/local";
import { Metadata, Viewport } from "next";
import ClientLayout from "./ClientLayout";
import GoogleAnalytics from "components/GoogleAnalytics";
import "src/app.scss";

const DEFAULT_DESCRIPTION =
  "Mission Bit is a 501(c)3 non-profit offering coding education and industry experiences to equip, empower and inspire public school youth to build products they dream up and broaden the opportunity horizon they envision for themselves.";

export const runtime = "edge";

export const viewport: Viewport = {
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.ORIGIN ?? "https://donate.missionbit.org/"),
  twitter: {
    card: "summary",
    site: "@missionbit",
  },
  openGraph: {
    siteName: "Mission Bit",
    type: "website",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/images/social/logo-fb.png" }],
  },
  description: DEFAULT_DESCRIPTION,
  icons: [
    { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#4949B4" },
  ],
};

const montserrat = localFont({
  src: [
    {
      path: "../public/fonts/montserrat-v25-latin-regular.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "../public/fonts/montserrat-v25-latin-italic.woff2",
      style: "italic",
      weight: "400",
    },
    {
      path: "../public/fonts/montserrat-v25-latin-600.woff2",
      style: "normal",
      weight: "600",
    },
    {
      path: "../public/fonts/montserrat-v25-latin-700.woff2",
      style: "normal",
      weight: "700",
    },
    {
      path: "../public/fonts/montserrat-v25-latin-600italic.woff2",
      style: "italic",
      weight: "600",
    },
  ],
  variable: "--font-Montserrat",
});

export default function RootLayout({ children }: React.PropsWithChildren<{}>) {
  const buildTime = Date.now();
  return (
    <html lang="en" className={montserrat.className}>
      <body>
        <GoogleAnalytics />
        <ClientLayout buildTime={buildTime}>{children}</ClientLayout>
      </body>
    </html>
  );
}
