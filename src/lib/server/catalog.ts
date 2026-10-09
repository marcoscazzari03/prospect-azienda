import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Plan } from "./dal";

// Listino di riserva, identico alla migrazione iniziale: usato solo se il
// database non è raggiungibile (es. anteprima senza variabili d'ambiente).
const FALLBACK: Plan[] = [
  { id: "free", name: "Gratis", kind: "free", price_cents: 0, credits: 15, credits_valid_months: 12, max_users: 1, max_active_searches: 1, max_quantity_per_search: 10, enrichment_per_run_max: 3, features: ["15 crediti di prova", "1 ricerca alla volta", "Export CSV"], highlighted: false, sort: 0 },
  { id: "pack_100", name: "Pacchetto 100", kind: "pack", price_cents: 4900, credits: 100, credits_valid_months: 12, max_users: 1, max_active_searches: 2, max_quantity_per_search: 100, enrichment_per_run_max: 40, features: ["100 crediti validi 12 mesi", "Export CSV"], highlighted: false, sort: 10 },
  { id: "pack_500", name: "Pacchetto 500", kind: "pack", price_cents: 19900, credits: 500, credits_valid_months: 12, max_users: 1, max_active_searches: 3, max_quantity_per_search: 250, enrichment_per_run_max: 120, features: ["500 crediti validi 12 mesi", "Export CSV"], highlighted: false, sort: 11 },
  { id: "pack_2000", name: "Pacchetto 2.000", kind: "pack", price_cents: 69000, credits: 2000, credits_valid_months: 12, max_users: 1, max_active_searches: 3, max_quantity_per_search: 500, enrichment_per_run_max: 250, features: ["2.000 crediti validi 12 mesi", "Export CSV"], highlighted: false, sort: 12 },
  { id: "starter", name: "Starter", kind: "subscription", price_cents: 4900, credits: 150, credits_valid_months: 2, max_users: 1, max_active_searches: 2, max_quantity_per_search: 150, enrichment_per_run_max: 60, features: ["150 crediti al mese", "Crediti non usati validi un mese in più", "Fino a 150 lead per ricerca", "2 ricerche in parallelo"], highlighted: false, sort: 20 },
  { id: "growth", name: "Growth", kind: "subscription", price_cents: 14900, credits: 600, credits_valid_months: 2, max_users: 3, max_active_searches: 5, max_quantity_per_search: 500, enrichment_per_run_max: 200, features: ["600 crediti al mese", "Fino a 500 lead per ricerca", "5 ricerche in parallelo", "Più verifiche delle email nominative"], highlighted: true, sort: 21 },
  { id: "scale", name: "Scale", kind: "subscription", price_cents: 39900, credits: 2000, credits_valid_months: 2, max_users: 10, max_active_searches: 10, max_quantity_per_search: 1000, enrichment_per_run_max: 500, features: ["2.000 crediti al mese", "Fino a 1.000 lead per ricerca", "10 ricerche in parallelo", "Supporto prioritario"], highlighted: false, sort: 22 },
];

export async function getPublicPlans(): Promise<Plan[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return FALLBACK;
  try {
    const db = createSupabase(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from("plans").select("*").order("sort");
    return error || !data?.length ? FALLBACK : (data as Plan[]);
  } catch {
    return FALLBACK;
  }
}
