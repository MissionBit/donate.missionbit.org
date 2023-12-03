/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import styles from "./Landing.module.scss";
import Image from "next/legacy/image";
import Embellishment from "public/images/Embellishment_20_Orange_RGB.png";
import Sticker from "public/images/sticker-cs4a.png";

export const Landing = (): JSX.Element => {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>
        Can our students count on you? Donate now.
      </h1>
      <div className={styles.sticker}>
        <div className={styles.stickerWrapper}>
          <Image
            src={Sticker}
            alt=""
            loading="eager"
            width={150}
            height={(150 * Sticker.height) / Sticker.width}
            priority
            objectFit="contain"
          />
        </div>
      </div>
      <div className={styles.embellishment}>
        <div className={styles.embellishmentWrapper}>
          <Image
            src={Embellishment}
            alt=""
            loading="eager"
            width={150}
            height={(150 * Embellishment.height) / Embellishment.width}
            priority
            objectFit="contain"
          />
        </div>
      </div>
    </div>
  );
};

export default Landing;
