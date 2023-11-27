import { NextApiRequest, NextApiResponse } from "next";
import slack from "src/slack";

const eventbriteToken = process.env.EVENTBRITE_TOKEN;

function eventbriteAuth() {
  return { Authorization: `Bearer ${eventbriteToken}` } as const;
}

async function handleOrderPlaced(api_url: string): Promise<void> {
  const order = await fetch(
    `${api_url}?expand=event,attendees,attendees.promotional_code`,
    {
      headers: eventbriteAuth(),
    },
  ).then((res) => res.json());
  const { id, costs, event, attendees } = order;

  const text = [
    `${event.name.text} order <https://www.eventbrite.com/reports?eid=${event.id}&rid=h&filterby=all,${id}|#${id}> (${costs.base_price.display})`,
    ...attendees.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) =>
        `- ${v.profile.name} (${v.profile.email})${
          v.promotional_code ? ` | _${v.promotional_code.code}_` : ""
        }`,
    ),
  ].join("\n");
  await slack.chat.postMessage({
    channel: "#eventbrite",
    text,
    unfurl_links: false,
    unfurl_media: false,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (
    req.method !== "POST" ||
    req.headers["content-type"] !== "application/json"
  ) {
    res.status(400).end();
    return;
  }
  /*
  {
    "api_url": "https://www.eventbriteapi.com/v3/orders/1546689753/",
    "config": {
      "action": "order.placed",
      "endpoint_url": "https://wh.automate.io/webhook/5fac85ffccf21a5f511e23fe",
      "user_id": "83632994431",
      "webhook_id": "4578092"
    }
  }
  */
  const { api_url, config } = req.body;
  if (
    typeof api_url !== "string" ||
    typeof config !== "object" ||
    config.action !== "order.placed"
  ) {
    res.status(400).end();
    return;
  }
  await handleOrderPlaced(api_url);
  res.status(200).json({ status: "success" });
}
