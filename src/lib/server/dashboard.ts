import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES, type LeadStage } from "@/lib/domain/leads";
import { monthStats } from "@/lib/domain/month-stats";

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
  // Dal 1° del mese precedente (variazioni delle statistiche) o dall'inizio del periodo, se prima; un giorno in più di
  // margine per il fuso orario, il filtro esatto è per giorno.
  const prevMonthStart = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 2, 1));
  const since = new Date(Math.min(from.getTime(), prevMonthStart.getTime(), now.getTime() - 30 * 86_400_000) - 86_400_000).toISOString();

  const [{ data: recent }, { count: total }, { count: withSignals }, { data: stages }, { data: running }, { data: searches }] = await Promise.all([
    supabase.from("deliveries").select("delivered_at, credits, signals:data->signals").gte("delivered_at", since).limit(20000),
    supabase.from("deliveries").select("id", { count: "exact", head: true }).is("deleted_at", null),
    // Lead con almeno un'opportunità verificata (data.signals presente).
    supabase.from("deliveries").select("id", { count: "exact", head: true }).is("deleted_at", null).not("data->signals", "is", null),
    supabase.from("deliveries").select("stage").is("deleted_at", null).is("archived_at", null).limit(20000),
    supabase.from("searches").select("credits_reserved, credits_charged").in("status", ["queued", "running"]),
    supabase
      .from("searches")
      .select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at, repeat, signals:target->signals->codes")
      .is("deleted_at", null)
      .is("archived_at", null)
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

  const stats = monthStats((recent ?? []).map((r) => ({ delivered_at: r.delivered_at, credits: r.credits, signal: Array.isArray(r.signals) ? r.signals.length > 0 : Boolean(r.signals) })), now, TZ);

  return {
    days,
    stats,
    monthLeads,
    monthCredits,
    totalLeads: total ?? 0,
    signalLeads: withSignals ?? 0,
    activeSearches: running?.length ?? 0,
    reserved: (running ?? []).reduce((s, r) => s + r.credits_reserved - r.credits_charged, 0),
    pipeline,
    searches: searches ?? [],
  };
}
