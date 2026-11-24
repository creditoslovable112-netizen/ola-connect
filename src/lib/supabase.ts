import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://obaxshuklmrwjplvvhpd.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_lVpoQYe9lwg2FQv_5xCjHQ_vsKOVa1u";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  db: { schema: "public" },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Performs a harmless read against a table protected by RLS.
 * Anonymous users receive no profile rows; signed-in users only see their own.
 */
export async function checkSupabaseConnection(): Promise<void> {
  const { error } = await supabase.from("profiles").select("id").limit(1);
  if (error) throw error;
}
