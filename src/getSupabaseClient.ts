import { SupabaseClient, createClient } from "@supabase/supabase-js";

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_PROJECT_URL!,
    process.env.SUPABASE_PRIVATE_API_KEY!,
  );
}
