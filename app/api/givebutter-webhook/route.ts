import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import requireEnv from "src/requireEnv";
import { getSupabaseClient } from "src/getSupabaseClient";
import { Webhook } from "src/givebutter/webhook";
import { getCampaignsUrl } from "src/givebutter/campaign";
import { getContactsUrl } from "src/givebutter/contact";
import { getTicketsUrl } from "src/givebutter/ticket";
import { getTransactionsUrl } from "src/givebutter/transaction";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function getObjectUrl(hook: S.Schema.Type<typeof Webhook>): string {
  switch (hook.event) {
    case "campaign.created":
    case "campaign.updated":
      return getCampaignsUrl()[0];
    case "contact.created":
      return getContactsUrl()[0];
    case "ticket.created":
      return getTicketsUrl()[0];
    case "transaction.succeeded":
      return getTransactionsUrl()[0];
  }
}

function toRow(hook: S.Schema.Type<typeof Webhook>) {
  const url = new URL(getObjectUrl(hook));
  url.search = "";
  return {
    id: `${url}/${hook.data.id}`,
    created_at: hook.data.created_at,
    data: hook.data,
    ...("updated_at" in hook.data ? { updated_at: hook.data.updated_at } : {}),
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const sig = req.headers.get("signature") ?? undefined;
    if (sig === undefined) {
      throw new Error(`Missing signature`);
    }
    if (sig !== requireEnv("GIVEBUTTER_SIGNING_SECRET")) {
      throw new Error(`Invalid signature`);
    }
  } catch (err) {
    console.error(err);
    return Response.json(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }
  const supabase = getSupabaseClient();
  const body = await req.json();
  const table = supabase.from("givebutter_webhook");
  try {
    const hook = await Effect.runPromise(S.decodeUnknown(Webhook)(body));
    const db = await table.insert({
      givebutter_id: hook.id,
      event: hook.event,
      data: hook.data,
    });
    const upsert = await supabase
      .from("givebutter_object")
      .upsert(toRow(hook), { count: "exact" });
    return Response.json({ received: true, state: "inserted", db, upsert });
  } catch (err) {
    if (
      body &&
      typeof body === "object" &&
      typeof body.event === "string" &&
      typeof body.data === "object"
    ) {
      const db = await table.insert({
        givebutter_id: body.id ?? null,
        event: body.event,
        data: body.data,
        status: { error: "parse_error", err },
      });
      // TODO slack and salesforce push?
      return Response.json({ received: true, state: "parse_error", db });
    } else {
      console.error(err);
      return Response.json(`Webhook Error: ${(err as Error).message}`, {
        status: 400,
      });
    }
  }
}
