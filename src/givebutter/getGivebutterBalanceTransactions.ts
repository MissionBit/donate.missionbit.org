import { Effect } from "effect";
import * as S from "@effect/schema/Schema";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "src/getSupabaseClient";
import type { BalanceTransaction } from "src/stripeBalanceTransactions";
import { Transaction } from "./transaction";

const DB_TABLE_NAME = `givebutter_transactions`;

function unixToISOTimestamp(unix: number): string {
  return new Date(1000 * unix).toISOString();
}

function isoTimestampToUnix(timestamp: string): number {
  return new Date(timestamp).getTime() / 1000;
}

async function getDbTransactions(
  supabase: SupabaseClient,
  created: number,
): Promise<BalanceTransaction[]> {
  const { data, error } = await supabase
    .from(DB_TABLE_NAME)
    .select("id, created_at, data")
    .gte("created_at", unixToISOTimestamp(created))
    .order("created_at", { ascending: true });
  if (error || !data) {
    console.error(error);
    throw new Error(error?.message ?? "Unknown error");
  }
  const transactions: BalanceTransaction[] = [];
  for (const row of data) {
    const rowCreated = isoTimestampToUnix(row.created_at);
    created = Math.max(created, rowCreated);
    const data = Effect.runSync(S.decodeUnknown(Transaction)(row.data));
    if (data.giving_space && data.giving_space.amount > 0) {
      transactions.push({
        id: row.id,
        amount: data.giving_space.amount * 100,
        name: data.giving_space.name,
        type: "direct",
        subscription: data.plan_id !== null,
        created: rowCreated,
      });
    } else if (data.amount > 0) {
      transactions.push({
        id: row.id,
        amount: data.amount * 100,
        name:
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          "Anonymous",
        type: "direct",
        subscription: data.plan_id !== null,
        created: rowCreated,
      });
    }
  }
  return transactions;
}

export async function getGivebutterBalanceTransactions(
  created: number,
): Promise<BalanceTransaction[]> {
  const supabase = getSupabaseClient();
  return await getDbTransactions(supabase, created);
}

export default getGivebutterBalanceTransactions;
