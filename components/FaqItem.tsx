import * as React from "react";
import { useState } from "react";
import clsx from "clsx";
import styles from "./FaqItem.module.scss";

const FaqItem: React.FC<{
  question: React.ReactNode;
  children: React.ReactNode;
}> = ({ question, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="drawer">
      <div
        className={clsx("drawer__title", "drawer-trigger", styles.trigger, {
          show,
        })}
      >
        <input
          type="checkbox"
          onChange={(e) => {
            setShow(e.currentTarget.checked);
          }}
        />
        {question}
      </div>
      <div className={clsx(styles.drawer__content, "wysiwyg")}>
        <div className={clsx(styles.accordion, "accordion")}>
          <div className="accordion__content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default FaqItem;
