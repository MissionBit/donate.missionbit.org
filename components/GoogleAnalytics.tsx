import * as React from "react";
import oneLine from "src/oneLine";
import Script from "next/script";
import ReactDOM from "react-dom";

const GA_MEASUREMENT_ID = "UA-47473369-4";
const ADWORDS_CONVERSION_ID = "AW-319322078";

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string): void => {
  if (typeof window !== "undefined" && "gtag" in window) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label: string;
  value: number;
}): void => {
  if (typeof window !== "undefined" && "gtag" in window) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export function GoogleAnalytics() {
  [
    "https://www.google.com",
    "https://www.google-analytics.com",
    "https://stats.g.doubleclick.net",
  ].forEach((href) => {
    ReactDOM.prefetchDNS(href);
  });
  return (
    <>
      <Script
        id="google-analytics-script"
        dangerouslySetInnerHTML={{
          __html: oneLine`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
    });
    gtag('config', '${ADWORDS_CONVERSION_ID}');
  `,
        }}
      />
      <Script
        async
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
    </>
  );
}

export default GoogleAnalytics;
