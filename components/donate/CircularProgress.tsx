import * as React from "react";
import styles from "./CircularProgress.module.scss";
import clsx from "clsx";

export interface CircularProgressProps {
  className?: string;
}

export function CircularProgress(props: CircularProgressProps): JSX.Element {
  return <span className={clsx(styles.root, props.className)}></span>;
}

export default CircularProgress;
