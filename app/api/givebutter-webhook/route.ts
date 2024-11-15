import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import requireEnv from "src/requireEnv";
import { getSupabaseClient, SupabaseContext } from "src/getSupabaseClient";
import { Webhook } from "src/givebutter/webhook";
import { getCampaignsUrl } from "src/givebutter/campaign";
import { getContactsUrl } from "src/givebutter/contact";
import { getTicketsUrl } from "src/givebutter/ticket";
import { getTransactionsUrl, Transaction } from "src/givebutter/transaction";
import { getPlansUrl } from "src/givebutter/plan";
import { ApiLimiter, giveButterGet } from "src/givebutter/http";
import { HttpClient } from "@effect/platform";
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeSdk } from "@effect/opentelemetry";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "givebutter-salesforce" },
  spanProcessor: new BatchSpanProcessor(
    // https://effect.website/docs/guides/observability/telemetry/tracing
    // values.otel ? new OTLPTraceExporter() : new ConsoleSpanExporter(),
    new ConsoleSpanExporter(),
  ),
}));

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
    const row = toRow(hook);
    const upsert = await supabase
      .from("givebutter_object")
      .upsert(row, { count: "exact" });
    const cascades: string[] = [];
    if (hook.event === "transaction.succeeded") {
      const txn = await Effect.runPromise(
        S.decodeUnknown(Transaction)(row.data),
      );
      const plans = new Set<string>();
      if (txn.plan_id) {
        plans.add(txn.plan_id);
      }
      for (const sub of txn.transactions) {
        if (sub.plan_id) {
          plans.add(sub.plan_id);
        }
      }
      cascades.push(...plans);
      for (const plan_id of plans) {
        await Effect.runPromise(
          Effect.scoped(upsertPlan(plan_id)).pipe(
            Effect.provide(NodeSdkLive),
            Effect.provide(ApiLimiter.Live),
            Effect.provide(HttpClient.layer),
            Effect.provide(SupabaseContext.Live),
            Effect.catchAllCause(Effect.logError),
            Effect.withSpan("webhook", { attributes: { hook } }),
          ),
        ).catch((err) => console.error(err));
      }
    }
    return Response.json({
      received: true,
      state: "inserted",
      db,
      upsert,
      cascades,
    });
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

function upsertPlan(plan_id: string) {
  const [prefix, schema] = getPlansUrl();
  return Effect.gen(function* () {
    const row = yield* giveButterGet(`${prefix}/${plan_id}`, schema);
    const supabase = yield* SupabaseContext;
    return yield* Effect.tryPromise({
      try: async () => {
        const { error, count } = await supabase
          .from("givebutter_object")
          .upsert(row, { count: "exact" });
        if (error) {
          console.error(`Error with ${prefix}`);
          throw error;
        }
        console.log(`Upserted ${count} rows from ${prefix}/${plan_id}`);
        return row.id;
      },
      catch: (unknown) => new Error(`something went wrong ${unknown}`),
    });
  }).pipe(Effect.withSpan(`upsertPlan`, { attributes: { plan_id } }));
}
