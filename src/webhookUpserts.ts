import { Effect } from "effect";
import { SupabaseContext } from "src/getSupabaseClient";
import { getContactsUrl } from "src/givebutter/contact";
import { getPlansUrl } from "src/givebutter/plan";
import { giveButterGet } from "src/givebutter/http";
import { toSupabaseRow } from "src/toSupabaseRow";

export function upsertContact(contact_id: string) {
  const [prefix, schema] = getContactsUrl(null);
  return Effect.gen(function* () {
    const row = yield* giveButterGet(`${prefix}/${contact_id}`, schema);
    const supabase = yield* SupabaseContext;
    return yield* Effect.tryPromise({
      try: async () => {
        const { error, count } = await supabase
          .from("givebutter_object")
          .upsert(toSupabaseRow(prefix)(row), { count: "exact" });
        if (error) {
          console.error(`Error with ${prefix}`);
          throw error;
        }
        console.log(`Upserted ${count} rows from ${prefix}/${contact_id}`);
        return row;
      },
      catch: (unknown) => unknown,
    });
  }).pipe(Effect.withSpan(`upsertContact`, { attributes: { contact_id } }));
}

export function upsertPlan(plan_id: string) {
  const [prefix, schema] = getPlansUrl();
  return Effect.gen(function* () {
    const row = yield* giveButterGet(`${prefix}/${plan_id}`, schema);
    const supabase = yield* SupabaseContext;
    return yield* Effect.tryPromise({
      try: async () => {
        const { error, count } = await supabase
          .from("givebutter_object")
          .upsert(toSupabaseRow(prefix)(row), { count: "exact" });
        if (error) {
          console.error(`Error with ${prefix}`);
          throw error;
        }
        console.log(`Upserted ${count} rows from ${prefix}/${plan_id}`);
        return row;
      },
      catch: (unknown) => unknown,
    });
  }).pipe(Effect.withSpan(`upsertPlan`, { attributes: { plan_id } }));
}
