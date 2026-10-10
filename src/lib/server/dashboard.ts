import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES, type LeadStage } from "@/lib/domain/leads";

// Dati della panoramica del cliente (letti con la RLS dell'utente).
export type Period = 7 | 30 | 90;
export const PERIODS: Period[] = [7, 30, 90];

const TZ = "Europe/Rome";
const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ }); // AAAA-MM-GG

export async function dashboardData(period: Period) {
  const supabase = await createClient();
  const now = new Date();
  const from = new Date(now.getTime() - (period - 1) * 86_400_000);
  const fromKey = dayKey(from);
  const monthKey = dayKey(now).slice(0, 7);
  // Un giorno in più di margine per il fuso orario; il filtro esatto è per giorno.
  const since = new Date(Math.min(from.getTime(), new Date(`${monthKey}-01T00:00:00Z`).getTime()) - 86_400_000).toISOString();

  const [{ data: recent }, { count: total }, { count: personal }, { data: stages }, { data: running }, { data: searches }] = await Promise.all([
    supabase.from("deliveries").select("delivered_at, credits").gte("delivered_at", since).limit(20000),
    supabase.from("deliveries").select("id", { count: "exact", head: true }),
    supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("email_type", "personal"),
    supabase.from("deliveries").select("stage").limit(20000),
    supabase.from("searches").select("credits_reserved, credits_charged").in("status", ["queued", "running"]),
    supabase
      .from("searches")
      .select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at, repeat")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const perDay = new Map<string, number>();
  let monthLeads = 0;
  let monthCredits = 0;
  for (const d of recent ?? []) {
    const k = dayKey(new Date(d.delivered_at));
    if (k >= fromKey) perDay.set(k, (perDay.get(k) ?? 0) + 1);
    if (k.startsWith(monthKey)) {
      monthLeads++;
      monthCredits += d.credits;
    }
  }
  const days = Array.from({ length: period }, (_, i) => {
    const d = new Date(from.getTime() + i * 86_400_000);
    const k = dayKey(d);
    return { key: k, label: d.toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: TZ }), count: perDay.get(k) ?? 0 };
  });

  const pipeline = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0])) as Record<LeadStage, number>;
  for (const r of stages ?? []) if (r.stage in pipeline) pipeline[r.stage as LeadStage]++;

  return {
    days,
    monthLeads,
    monthCredits,
    totalLeads: total ?? 0,
    personalLeads: personal ?? 0,
    activeSearches: running?.length ?? 0,
    reserved: (running ?? []).reduce((s, r) => s + r.credits_reserved - r.credits_charged, 0),
    pipeline,
    searches: searches ?? [],
  };
}
