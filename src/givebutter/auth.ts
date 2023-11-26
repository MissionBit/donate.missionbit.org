const givebutterApiKey = process.env.GIVEBUTTER_API_KEY;

export function givebutterAuth() {
  return { Authorization: `Bearer ${givebutterApiKey}` } as const;
}
