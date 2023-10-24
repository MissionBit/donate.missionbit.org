import * as React from "react";
import styles from "./Testimonial.module.scss";
import clsx from "clsx";
import StudentImage from "public/images/Testimonial-Rigoberto-Morales-473x479@2x.jpg";
import Embellishment from "public/images/Embellishment_22_Teal_RGB.png";
import Image from "next/image";

export default function Testimonial({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx(className, styles.root)}>
      <svg width="0" height="0">
        <clipPath id="archClip" clipPathUnits="objectBoundingBox">
          <path d="M1 0.5C1 0.223872 0.776128 0 0.5 0C0.223872 0 0 0.223872 0 0.5V1H1V0.5Z"></path>
        </clipPath>
      </svg>
      <div className={styles.wrapper}>
        <div className={styles.images}>
          <Image
            src={StudentImage}
            width={361.7}
            height={(361.7 / 473) * 479}
            alt="Rigoberto M."
            className={styles.photo}
          />
          <div className={styles.embellishment}>
            <Image
              src={Embellishment}
              width={266.1}
              height={(266.1 / 963) * 978}
              alt=""
            />
          </div>
        </div>
        <div className={styles.box}>
          <p className="h4">
            <strong>Rigoberto M.</strong>
          </p>
          <p>
            “With Mission Bit, I was able to understand what the inside of a
            website looks like and that the smallest things make a big
            difference in web design. My goal now is to master computer
            science.”
          </p>
        </div>
      </div>
    </div>
  );
}
