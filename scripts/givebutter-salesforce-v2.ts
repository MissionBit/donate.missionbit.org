import { Console, Effect } from "effect";
import { getSupabaseClient } from "src/getSupabaseClient";
import { NodeSdk } from "@effect/opentelemetry";
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Campaign } from "src/givebutter/campaign";
import { Plan } from "src/givebutter/plan";
import { Ticket } from "src/givebutter/ticket";
import { Transaction } from "src/givebutter/transaction";
import * as S from "@effect/schema/Schema";
import { parseArgs } from "node:util";
import { SalesforceLive } from "src/salesforce/layer";
import { SalesforceClient } from "src/salesforce/http";
import { HttpClient } from "@effect/platform";
import { SObjectClient } from "src/salesforce/SObjectClient";

const { values } = parseArgs({
  options: {
    all: { type: "boolean", default: false, short: "a" },
    id: { type: "string" },
  },
});

export class GivebutterTransactionRow extends S.Class<GivebutterTransactionRow>(
  "GivebutterTransactionRow",
)({
  id: S.String,
  created_at: S.String,
  updated_at: S.String,
  data: Transaction,
  campaign_data: S.NullOr(Campaign),
  plan_data: S.NullOr(Plan),
  tickets_data: S.Array(Ticket),
}) {}

const processRow = (info: GivebutterTransactionRow) =>
  Effect.gen(function* () {
    yield* Console.log(info.data);
    const client = yield* SObjectClient;
    const givebutterContactId = info.data.contact_id;
    const existing = yield* client.contact.get(
      `Givebutter_Contact_ID__c/${givebutterContactId}`,
    );
    yield* Console.log(existing);

    // const metadata = await createOrFetchOpportunityFromGivebutterTransaction(
    //   client,
    //   info,
    // );
    // await supabase
    //   .from("givebutter_salesforce")
    //   .upsert({ id: row.id, metadata });
    // console.log(`Resolved ${row.id} ${JSON.stringify(metadata, null, 2)}`);
  }).pipe(Effect.withSpan("processRow", { attributes: { id: info.data.id } }));

const mainProgram = Effect.gen(function* () {
  const supabase = getSupabaseClient();
  const data = yield* Effect.tryPromise(() => {
    const r = supabase
      .from(
        values.all
          ? "givebutter_transactions"
          : "givebutter_transactions_pending_salesforce",
      )
      .select(
        "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data",
      );
    return values.id ? r.filter("id", "eq", values.id) : r;
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error ? Effect.fail(error) : Effect.succeed(data),
    ),
  );
  for (const row of data) {
    const info = yield* S.decodeUnknown(GivebutterTransactionRow)(row);
    yield* processRow(info);
  }
});

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "givebutter-salesforce" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

async function main() {
  const prog = Effect.scoped(mainProgram).pipe(
    Effect.provide(SalesforceLive),
    Effect.provide(NodeSdkLive),
    Effect.provide(HttpClient.layer),
  );
  Effect.runPromise(prog);
}

main();
