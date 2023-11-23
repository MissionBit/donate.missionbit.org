import * as React from "react";
import clsx from "clsx";
import Image from "next/image";
import Photo from "public/images/Donate-AnnualReports@2x.jpeg";
import Sticker from "public/images/sticker-students.png";
import styles from "./AnnualReports.module.scss";

const REPORTS: readonly (readonly [number, string])[] = [
  [
    2022,
    "https://drive.google.com/file/d/1XBikbf_Rg0zi7duY32c2aI-fVcGTnIw5/view",
  ],
  [
    2021,
    "https://drive.google.com/file/d/13-yocY29Y06J4UWOXUyujvt3ufwnBDxV/view",
  ],
  [2020, "/annual-reports/2020/2020MissionBitAnnualReport.pdf"],
  [2019, "/annual-reports/2019/mission-bit-annual-report-2019.pdf"],
];

export const AnnualReports: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <section
      className={clsx(
        styles.root,
        className,
        "pxblock",
        "pxblock--text-and-media",
        "bg--white",
        "layout--image-left",
        "sticker-layout--left",
        "padding--none",
      )}
    >
      <div className="px-container">
        <div className="grid-columns">
          <div className="text column wysiwyg">
            <h2>Annual Reports</h2>
            <p>
              Our annual reports provide a comprehensive overview of Mission
              Bit’s impact and achievements over the past year, including
              student success stories, financial information, and program
              highlights. Learn about our progress and join us in our mission to
              create a more diverse and inclusive tech industry.
            </p>
            {REPORTS.map(([year, href]) => (
              <p key={year}>
                <a
                  className="link--list"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {year} Annual Report
                </a>
              </p>
            ))}
          </div>
          <div className="media column">
            <div className={clsx("image", styles.image)}>
              <Image
                src={Photo}
                alt="Mission Bit students"
                objectFit="cover"
                objectPosition="center"
              />
              <div className="sticker">
                <Image src={Sticker} alt="" loading="eager" />
              </div>
              <div className="rip" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnnualReports;
