import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Riepilogo "dall'ultimo accesso": cosa è successo tra una visita e l'altra.
// Una visita nuova inizia dopo mezz'ora di assenza; ricaricare la pagina non
// azzera il riepilogo.
const NUOVA_VISITA_MS = 30 * 60_000;

export async function activitySince(userId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("seen_at, since_at, created_at").eq("user_id", userId).maybeSingle();
  const now = new Date();
  const seen = data?.seen_at ? new Date(data.seen_at) : null;
  const nuovaVisita = !seen || now.getTime() - seen.getTime() > NUOVA_VISITA_MS;
  const since = (nuovaVisita ? data?.seen_at : data?.since_at) ?? data?.created_at ?? now.toISOString();
  await db.from("profiles").update({ seen_at: now.toISOString(), since_at: since }).eq("user_id", userId);
  return since;
}

export type ActivityItem = { at: string; kind: "search" | "credits" | "expire"; text: string; tone: "ledger" | "stamp" | "brick" | "ink"; href?: string };

const MOVIMENTI = ["grant", "purchase", "subscription", "refund", "adjust", "expire"];

export async function activitySummary(since: string) {
  const supabase = await createClient();
  const [{ data: delivered }, { data: finished }, { data: ledger }, { data: recentSearches }, { data: recentLedger }] = await Promise.all([
    supabase.from("deliveries").select("credits").gt("delivered_at", since).limit(10000),
    supabase.from("searches").select("id, status").gt("finished_at", since).limit(500),
    supabase.from("credit_ledger").select("delta, kind").gt("created_at", since).in("kind", MOVIMENTI).limit(1000),
    supabase.from("searches").select("id, name, status, delivered, quantity, finished_at").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(6),
    supabase.from("credit_ledger").select("delta, kind, description, created_at").in("kind", MOVIMENTI).order("created_at", { ascending: false }).limit(6),
  ]);

  const summary = {
    leads: delivered?.length ?? 0,
    creditsUsed: (delivered ?? []).reduce((s, d) => s + d.credits, 0),
    completed: (finished ?? []).filter((s) => s.status === "completed" || s.status === "partial").length,
    failed: (finished ?? []).filter((s) => s.status === "failed").length,
    creditsAdded: (ledger ?? []).filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0),
    creditsExpired: -(ledger ?? []).filter((l) => l.kind === "expire").reduce((s, l) => s + l.delta, 0),
  };

  const items: ActivityItem[] = [
    ...(recentSearches ?? []).map((s): ActivityItem => ({
      at: s.finished_at!,
      kind: "search",
      href: `/app/ricerche/${s.id}`,
      tone: s.status === "failed" ? "brick" : s.status === "completed" ? "ledger" : "stamp",
      text:
        s.status === "failed"
          ? `Ricerca non riuscita: «${s.name}» (crediti restituiti)`
          : `Ricerca ${s.status === "completed" ? "completata" : "conclusa"}: «${s.name}», ${s.delivered} lead su ${s.quantity}`,
    })),
    ...(recentLedger ?? []).map((l): ActivityItem => ({
      at: l.created_at,
      kind: l.kind === "expire" ? "expire" : "credits",
      tone: l.delta > 0 ? "ledger" : "brick",
      text: `${l.delta > 0 ? "+" : ""}${l.delta} crediti · ${l.description}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return { summary, items };
}
