import { DEFAULT_PREFILL, DonatePrefill } from "./parseDonatePrefill";
import { BalanceProps } from "pages/live";
import { useBuildTime } from "components/BuildTimeContext";

export function useCampaign({
  campaign,
  prefill = DEFAULT_PREFILL,
}: {
  campaign?: BalanceProps | undefined;
  prefill?: DonatePrefill | undefined;
}): {
  campaign: BalanceProps | undefined;
  prefill: DonatePrefill;
  gala: boolean;
} {
  const buildTime = useBuildTime();
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
