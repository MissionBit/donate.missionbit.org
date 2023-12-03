import { parseDonatePrefill } from "components/donate/parseDonatePrefill";
import { headers } from "next/headers";
import { getOrigin } from "src/absoluteUrl";
import getBatch from "src/getBatch";
import getBalanceModifications from "src/googleBalanceModifications";

export const getLiveProps = async (
  params: Record<string, unknown> | undefined,
) => {
  const { startTimestamp } = await getBalanceModifications();
  const { batch, modifications } = await getBatch(startTimestamp);
  return {
    origin: getOrigin(headers().get("origin") ?? undefined),
    batch,
    modifications,
    prefill: parseDonatePrefill(params),
  };
};
