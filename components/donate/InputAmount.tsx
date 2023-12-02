import * as React from "react";
import styles from "./InputAmount.module.scss";
import clsx from "clsx";

export interface InputAmountProps {
  id: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function InputAmount(props: InputAmountProps): JSX.Element {
  const { id, name, value, onChange, className } = props;
  return (
    <label className={clsx(styles.root, className)} htmlFor={id}>
      <div className={styles.name}>{name}</div>
      <div className={styles.wrapper}>
        <div className={styles.adornment}>$</div>
        <input
          type="text"
          id={id}
          value={value}
          onChange={onChange}
          className={styles.input}
        />
      </div>
    </label>
  );
}

export default InputAmount;
