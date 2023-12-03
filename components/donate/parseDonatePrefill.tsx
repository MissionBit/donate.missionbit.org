import { parseCents, isFrequency, Frequency } from "src/stripeHelpers";
import { formatCents } from "./formatCents";

export interface DonatePrefill {
  frequency: Frequency;
  amount: string;
  presetAmounts: readonly number[];
}

export const DEFAULT_PREFILL: DonatePrefill = {
  frequency: "one-time",
  amount: "",
  presetAmounts: [25000, 10000, 5000],
};

export function parseDonatePrefill(
  obj:
    | ({
        frequency?: unknown;
        dollars?: unknown;
      } & Record<string, unknown>)
    | undefined,
): DonatePrefill {
  const { frequency, dollars } = obj ?? {};
  const rval = { ...DEFAULT_PREFILL };
  if (typeof frequency === "string" && isFrequency(frequency)) {
    rval.frequency = frequency;
  }
  if (typeof dollars === "string") {
    const cents = parseCents(dollars);
    if (cents) {
      rval.amount = formatCents(cents);
    }
  }
  return rval;
}
