import * as React from "react";
import { BalanceProps, useAnimatedGoal, useLiveDashboard } from "pages/live";
import Image from "next/image";
import Embellishment from "public/images/Embellishment_20_Orange_RGB.png";
import dollars from "src/dollars";
import styles from "./CampaignCard.module.scss";
import clsx from "clsx";

export function CampaignCard(props: {
  campaign: BalanceProps;
  className?: string;
}): JSX.Element | null {
  const dashboard = useLiveDashboard(props.campaign);
  const { goalName } = dashboard;
  const { goalCents, totalCents } = useAnimatedGoal(dashboard);
  return (
    <div className={clsx(styles.root, props.className)}>
      <h2 className={styles.goalName}>
        <div className={styles.embellishment}>
          <div className={styles.embellishmentWrapper}>
            <Image
              src={Embellishment}
              alt=""
              width={64}
              height={(64 * Embellishment.height) / Embellishment.width}
              objectFit="contain"
              priority
              loading="eager"
            />
          </div>
        </div>
        {goalName}
      </h2>
      <div className={styles.progressText}>
        <strong className={styles.total}>{dollars(totalCents)}</strong>
        <span className={styles.of}>of</span>
        <span className={styles.goal}>{dollars(goalCents)}</span>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progress}
          style={{
            width: `${Math.min(100, 100 * (totalCents / goalCents))}%`,
          }}
        />
      </div>
    </div>
  );
}
