import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

// Client con service role: SOLO nel codice server, dopo aver verificato
// chi è l'utente e cosa può fare. Bypassa la RLS.
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  cached ??= createClient<Database>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
