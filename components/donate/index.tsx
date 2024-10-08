"use client";
import * as React from "react";
import Landing from "./Landing";
import MakeAnOnlineGift from "./MakeAnOnlineGift";
import AnnualReports from "./AnnualReports";
import OtherWaysToGive from "./OtherWaysToGive";
import { DonatePrefill } from "./parseDonatePrefill";
import clsx from "clsx";
import styles from "./index.module.scss";
import Testimonial from "./Testimonial";
import { useCampaign } from "./useCampaign";
import { CampaignCard } from "./CampaignCard";
import { Agenda } from "./Agenda";
import { useSearchParams } from "next/navigation";
import type { BalanceProps } from "./LiveDashboard";

export interface DonateProps {
  prefill?: DonatePrefill | undefined;
  campaign?: BalanceProps | undefined;
  buildTime: number;
}

const Donate: React.FC<DonateProps> = (props) => {
  const { campaign, prefill, gala } = useCampaign(props);
  const debugGala = useSearchParams()?.get("gala") === "string";
  const agenda = gala || debugGala ? campaign?.modifications.galaAgenda : null;
  return (
    <main id="main">
      <Landing />
      <div className={clsx(styles.root, { [styles.gala]: gala })}>
        {agenda ? <Agenda agenda={agenda} className={styles.agenda} /> : null}
        {campaign ? (
          <CampaignCard campaign={campaign} className={styles.campaignCard} />
        ) : null}
        <MakeAnOnlineGift
          className={styles.makeAnOnlineGift}
          prefill={prefill}
        />
        <Testimonial className={styles.testimonial} />
        <OtherWaysToGive className={styles.otherWaysToGive} />
        <AnnualReports className={styles.annualReports} />
      </div>
    </main>
  );
};

export default Donate;
