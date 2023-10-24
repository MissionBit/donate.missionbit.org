/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import styles from "./Landing.module.scss";
import Embellishment from "public/images/Embellishment_20_Orange_RGB.png";
import Sticker from "public/images/sticker-cs4a.png";

export const Landing = (): JSX.Element => {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>
        Can our students count on you? Donate now.
      </h1>
      <div className={styles.sticker}>
        <img src={Sticker.src} alt="" />
      </div>
      <div className={styles.embellishment}>
        <img src={Embellishment.src} alt="" />
      </div>
    </div>
  );
};

export default Landing;
