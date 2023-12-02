import * as React from "react";
import styles from "./IndigoButton.module.scss";
import clsx from "clsx";

export type IndigoButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export function IndigoButton(props: IndigoButtonProps): JSX.Element {
  return (
    <button
      {...props}
      className={clsx(
        styles.root,
        props.disabled && styles.disabled,
        props.className,
      )}
    />
  );
}

export default IndigoButton;
