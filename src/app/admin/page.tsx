import type { Metadata } from "next";
import { Card, PageHeader, SearchStatus, Stat } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEur, formatNumber } from "@/lib/domain/pricing";
import { requireAdmin } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Andamento" };

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const sum = <T,>(rows: T[] | null, f: (r: T) => number) => (rows ?? []).reduce((s, r) => s + (Number(f(r)) || 0), 0);

export default async function AdminHome() {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const db = createAdminClient();
  const d30 = since(30);
  // Volumi da startup: aggregazione in memoria. Oltre ~10k righe/mese spostare in viste SQL.
  const [payments, costs, deliveries, subs, orgs, searches, runsFailed, openReports] = await Promise.all([
    db.from("payments").select("amount_cents, kind").eq("status", "paid").gte("created_at", d30).limit(10000),
    db.from("run_costs").select("provider, total_eur").gte("created_at", d30).limit(50000),
    db.from("deliveries").select("credits, email_type, source").gte("delivered_at", d30).limit(100000),
    db.from("subscriptions").select("status, plans(price_cents)").in("status", ["active", "trialing", "past_due"]),
    db.from("organizations").select("id, plan_id", { count: "exact" }),
    db.from("searches").select("status").gte("created_at", d30).limit(10000),
    db.from("search_runs").select("id", { count: "exact", head: true }).in("status", ["failed", "dispatch_failed"]).gte("created_at", d30),
    db.from("lead_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const revenue = sum(payments.data, (p) => p.amount_cents) / 100;
  const cost = sum(costs.data, (c) => c.total_eur);
  const mrr = sum(subs.data, (s) => (s.plans as unknown as { price_cents: number } | null)?.price_cents ?? 0) / 100;
  const leads = deliveries.data?.length ?? 0;
  const credits = sum(deliveries.data, (d) => d.credits);
  const fromWarehouse = (deliveries.data ?? []).filter((d) => d.source === "warehouse").length;
  const paying = (orgs.data ?? []).filter((o) => o.plan_id !== "free").length;
  const byProvider = new Map<string, number>();
  for (const c of costs.data ?? []) byProvider.set(c.provider, (byProvider.get(c.provider) ?? 0) + Number(c.total_eur));
  const byStatus = new Map<string, number>();
  for (const s of searches.data ?? []) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  const margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : null;

  return (
    <>
      <PageHeader eyebrow="Ultimi 30 giorni" title="Andamento della piattaforma" description="Ricavi, costi dei fornitori e margine. Costi stimati dai consumi del motore × costi unitari (modificabili in Prezzi e costi)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Incassi" value={formatEur(revenue * 100)} tone="ledger" />
        <Stat label="Costi variabili" value={cost.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} />
        <Stat label="Margine lordo" value={margin === null ? "—" : `${margin}%`} tone={margin !== null && margin < 50 ? "stamp" : "ink"} hint={formatEur((revenue - cost) * 100)} />
        <Stat label="MRR abbonamenti" value={formatEur(mrr * 100)} hint={`${subs.data?.length ?? 0} abbonamenti attivi`} />
        <Stat label="Lead consegnati" value={formatNumber(leads)} hint={`${formatNumber(credits)} crediti consumati · ${leads ? Math.round((fromWarehouse / leads) * 100) : 0}% dal magazzino`} />
        <Stat label="Costo medio per lead" value={leads ? (cost / leads).toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "—"} />
        <Stat label="Clienti" value={formatNumber(orgs.count ?? 0)} hint={`${paying} paganti`} />
        <Stat label="Da gestire" value={openReports.count ?? 0} tone={(openReports.count ?? 0) > 0 ? "stamp" : "ink"} hint={`segnalazioni aperte · ${runsFailed.count ?? 0} giri falliti`} />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Costi per fornitore</h2>
          {[...byProvider.entries()].sort((a, b) => b[1] - a[1]).map(([p, v]) => (
            <div key={p} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
              <span>{p}</span>
              <span className="font-mono">{v.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
            </div>
          ))}
          {!byProvider.size && <p className="text-sm text-muted">Nessun costo registrato.</p>}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Ricerche per esito</h2>
          {[...byStatus.entries()].map(([s, n]) => (
            <div key={s} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <SearchStatus status={s} />
              <span className="font-mono">{n}</span>
            </div>
          ))}
          {!byStatus.size && <p className="text-sm text-muted">Nessuna ricerca.</p>}
        </Card>
      </div>
    </>
  );
}
