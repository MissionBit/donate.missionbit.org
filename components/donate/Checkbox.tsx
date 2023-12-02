import * as React from "react";
import styles from "./Checkbox.module.scss";
import clsx from "clsx";

export interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({
  id,
  className,
  checked,
  onChange,
  children,
}: React.PropsWithChildren<CheckboxProps>) {
  return (
    <label htmlFor={id} className={clsx(styles.label, className)}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => {
          onChange(e.currentTarget.checked);
        }}
        className={styles.checkbox}
      />
      <span className={styles.copy}>{children}</span>
    </label>
  );
}

export default Checkbox;
