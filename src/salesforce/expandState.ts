import us from "us";
export const expandState = (
  state?: string | undefined | null,
): string | undefined => (state ? us.states[state]?.name : undefined);
