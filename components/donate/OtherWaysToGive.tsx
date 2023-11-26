import * as React from "react";
import clsx from "clsx";
import FaqItem from "components/FaqItem";
import {
  EIN,
  STREET_ADDRESS,
  CITY_STATE_ZIP,
  PHONE_NUMBER,
  PHONE_HREF,
} from "src/orgInfo";
import { INFO_EMAIL, DEVELOPMENT_EMAIL } from "src/emails";
import styles from "./OtherWaysToGive.module.scss";

export const OtherWaysToGive: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <section
      id="other-ways-to-give"
      className={clsx(
        className,
        "pxblock",
        "pxblock--accordion",
        "style--default",
        "align--center",
        "padding--none",
      )}
    >
      <div className="px-container">
        <div className="accordion__content">
          <h2>Other ways to give</h2>
        </div>
        <div className="accordion__drawers">
          <FaqItem question="Check">
            <p>
              Make checks payable to <strong>Mission Bit</strong>. To receive a
              receipt electronically, write your email address in the memo of
              your check.
            </p>
            <p>
              Mission Bit
              <br />
              {STREET_ADDRESS}
              <br />
              {CITY_STATE_ZIP}
            </p>
            <p>
              EIN: {EIN}
              <br />
              Phone: {PHONE_NUMBER}
              <br />
              Contact: {INFO_EMAIL}
              <br />
              Mission Bit is a 501 (c)(3)
            </p>
          </FaqItem>
          <FaqItem question="Stock">
            <p>
              DTC number: 0226
              <br />
              Account name: Mission Bit
              <br />
              Account number: Z40224631
              <br />
              Brokerage: Fidelity
              <br />
              <br />
              In addition, please provide the following:
              <br />
              1. Name and mailing address.
              <br />
              2. Type of stock.
              <br />
              3. Number of shares.
              <br />
              <br />
              When you provide us this information, especially your name and
              address, we can personally thank you and send a tax receipt. For
              more information or assistance, please contact us by email at{" "}
              <a
                href={`mailto:${DEVELOPMENT_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {DEVELOPMENT_EMAIL}
              </a>
            </p>
          </FaqItem>
          <FaqItem question="Online">
            Online donations are the easiest way to give to Mission Bit. Please
            visit our secure online form above to make your donation today, and
            consider making your gift a monthly commitment to provide computer
            science education for free by choosing “Monthly”.
          </FaqItem>
          <FaqItem question="Matching Gift">
            You may be able to double or triple your gift through your
            employer’s matching gift program. Contact your HR department to find
            out if your company matches your charitable donations. If they do,
            let us know!
          </FaqItem>
          <FaqItem question="In-Kind Gift">
            We accept in-kind donations of laptops and other equipment.{" "}
            <a
              href={`mailto:${DEVELOPMENT_EMAIL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Us
            </a>{" "}
            if you have something to donate.
          </FaqItem>
          <FaqItem question="Other">
            For more information or assistance, please contact us by email at{" "}
            <a
              href={`mailto:${DEVELOPMENT_EMAIL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DEVELOPMENT_EMAIL}
            </a>{" "}
            or by phone at{" "}
            <a href={PHONE_HREF} target="_blank" rel="noopener noreferrer">
              {PHONE_NUMBER}
            </a>
            .
          </FaqItem>
        </div>
        <div className={styles.center}>
          <a
            href={`mailto:${DEVELOPMENT_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--orange-outline btn--icon-arrow"
            style={{ display: "inline-block" }}
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
};

export default OtherWaysToGive;
