import { Effect } from "effect";
import { getSupabaseClient } from "src/getSupabaseClient";
import { createOrFetchOpportunityFromGivebutterTransaction } from "src/givebutter-salesforce";
import { Campaign } from "src/givebutter/campaign";
import { Plan } from "src/givebutter/plan";
import { Ticket } from "src/givebutter/ticket";
import { Transaction } from "src/givebutter/transaction";
import { login } from "src/salesforce";
import * as S from "@effect/schema/Schema";

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("givebutter_transactions_pending_salesforce")
    .select(
      "id, created_at, updated_at, data, plan_data, campaign_data, tickets_data",
    );
  if (error) {
    console.error(error);
    throw error;
  }
  const client = await login();
  for (const row of data) {
    const info = await Effect.all({
      transaction: S.decodeUnknown(Transaction)(row.data),
      campaign: row.campaign_data
        ? S.decodeUnknown(Campaign)(row.campaign_data)
        : Effect.succeed(null),
      plan: row.plan_data
        ? S.decodeUnknown(Plan)(row.plan_data)
        : Effect.succeed(null),
      tickets: Effect.all(
        (row.tickets_data as unknown[]).map((data) =>
          S.decodeUnknown(Ticket)(data),
        ),
      ),
    }).pipe(Effect.runPromise);
    const metadata = await createOrFetchOpportunityFromGivebutterTransaction(
      client,
      info,
    );
    await supabase
      .from("givebutter_salesforce")
      .insert({ id: row.id, metadata });
    console.log(`Resolved ${row.id} ${JSON.stringify(metadata, null, 2)}`);
  }
}

main();
