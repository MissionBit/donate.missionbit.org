import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import requireEnv from "src/requireEnv";
import { getSupabaseClient } from "src/getSupabaseClient";
import { Webhook } from "src/givebutter/webhook";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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
    const {
      id: givebutter_id,
      event,
      data,
    } = await Effect.runPromise(S.parse(Webhook)(body));
    const db = await table.insert({ givebutter_id, event, data });
    return Response.json({ received: true, state: "inserted", db });
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
      return Response.json({ received: true, state: "parse_error", db });
    } else {
      console.error(err);
      return Response.json(`Webhook Error: ${(err as Error).message}`, {
        status: 400,
      });
    }
  }
}
