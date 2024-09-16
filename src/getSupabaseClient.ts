import type { PostgrestBuilder } from "@supabase/postgrest-js";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { Effect, Context, Layer, Config } from "effect";

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_PROJECT_URL!,
    process.env.SUPABASE_PRIVATE_API_KEY!,
  );
}

export class SupabaseContext extends Context.Tag("@services/Supabase")<
  SupabaseContext,
  SupabaseClient
>() {
  static Live = Layer.effect(
    SupabaseContext,
    Effect.all([
      Config.string("SUPABASE_PROJECT_URL"),
      Config.string("SUPABASE_PRIVATE_API_KEY"),
    ]).pipe(Effect.map((args) => createClient(...args))),
  );
}

export const evalQuery = <Result>(q: () => PostgrestBuilder<Result>) =>
  Effect.tryPromise(q).pipe(
    Effect.flatMap(({ data, error }) =>
      error ? Effect.fail(error) : Effect.succeed(data),
    ),
  );
