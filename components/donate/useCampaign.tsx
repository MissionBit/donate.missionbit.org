import type { BalanceProps } from "./LiveDashboard";
import { DEFAULT_PREFILL, DonatePrefill } from "./parseDonatePrefill";

export function useCampaign({
  buildTime,
  campaign,
  prefill = DEFAULT_PREFILL,
}: {
  campaign?: BalanceProps | undefined;
  prefill?: DonatePrefill | undefined;
  buildTime: number;
}): {
  campaign: BalanceProps | undefined;
  prefill: DonatePrefill;
  gala: boolean;
} {
  const endTimestamp = campaign?.modifications.endTimestamp;
  const presetAmounts = campaign?.modifications.presetAmounts;
  const galaDate = campaign?.modifications.galaDate;
  const buildDate = new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "short",
    timeZone: "America/Los_Angeles",
  }).format(buildTime);
  const gala = galaDate === buildDate;
  return !endTimestamp || endTimestamp * 1000 >= buildTime
    ? {
        campaign,
        prefill:
          Array.isArray(presetAmounts) && presetAmounts.length > 0
            ? { ...prefill, presetAmounts }
            : prefill,
        gala,
      }
    : { campaign: undefined, prefill, gala };
}
