import type { WebClient } from "@slack/web-api";

const token = process.env.SLACK_TOKEN;

export function getSlackAuthHeaders() {
  return { Authorization: `Bearer ${token}` };
}

export async function slackApiPost(method: string, body: unknown) {
  const url = new URL(method, `https://slack.com/api/${method}`);
  return await fetch(url.toString(), {
    headers: { ...getSlackAuthHeaders(), "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify(body),
  });
}

const postMessage: WebClient["chat"]["postMessage"] = async (args) => {
  const res = await slackApiPost("chat.postMessage", args);
  return await res.json();
};

export const slack = { chat: { postMessage } };

export default slack;
