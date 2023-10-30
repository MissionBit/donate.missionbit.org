import * as React from "react";
import clsx from "clsx";
import styles from "./Agenda.module.scss";

export function Agenda({
  agenda: { href, title },
  className,
}: {
  agenda: { href: string; title: string };
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx(styles.root, className)}>
      <a
        href={href}
        className="btn btn--orange btn--icon-arrow"
        target="_blank"
        rel="noreferrer"
      >
        {title}
      </a>
    </div>
  );
}
