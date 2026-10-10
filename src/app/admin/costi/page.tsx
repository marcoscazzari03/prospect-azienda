import type { Metadata } from "next";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/domain/pricing";
import { updateCostRate, updateCreditPrice, updateEnrichmentBudget } from "../actions";
import { requireAdmin } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Prezzi e costi" };

export default async function CostsPage() {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: rates }, { data: prices }, { data: plans }, { data: usage }] = await Promise.all([
    db.from("cost_rates").select("*").order("provider"),
    db.from("credit_prices").select("*").order("email_type"),
    db.from("plans").select("*").order("sort"),
    // Il consumo del mese non dipende dalla ricerca: basta un id qualsiasi.
    db.rpc("enrichment_usage", { p_search: "00000000-0000-0000-0000-000000000000" }).maybeSingle(),
  ]);
  const budget = (usage as { month_budget: number | null } | null)?.month_budget ?? null;
  const used = (usage as { month_used: number } | null)?.month_used ?? 0;
  return (
    <>
      <PageHeader title="Prezzi e costi" description="Costi unitari dei fornitori (per calcolare i margini) e crediti per tipo di email. I piani si modificano dal database (tabella plans)." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Costi unitari fornitori</h2>
          {(rates ?? []).map((r) => (
            <form key={r.provider} action={updateCostRate} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
              <input type="hidden" name="provider" value={r.provider} />
              <div className="flex-1 text-sm"><p className="font-medium">{r.provider}</p><p className="text-xs text-muted">{r.description} · per {r.unit}</p></div>
              <Input name="unitCost" type="number" step="0.0001" min="0" defaultValue={r.unit_cost_eur} className="w-28" aria-label="Costo unitario €" />
              <Button size="sm" variant="secondary">Salva</Button>
            </form>
          ))}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Crediti per lead</h2>
          {(prices ?? []).map((p) => (
            <form key={`${p.email_type}${p.email_status}`} action={updateCreditPrice} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
              <input type="hidden" name="type" value={p.email_type} />
              <input type="hidden" name="status" value={p.email_status} />
              <p className="flex-1 text-sm">{p.email_type === "personal" ? "Nominativa" : "Generica"} · {p.email_status}</p>
              <Input name="credits" type="number" min="0" max="20" defaultValue={p.credits} className="w-20" aria-label="Crediti" />
              <Button size="sm" variant="secondary">Salva</Button>
            </form>
          ))}
          <p className="mt-3 text-xs text-muted">Il massimo per modalità (tabella email_modes) limita comunque l&apos;addebito.</p>
        </Card>
      </div>
      <Card className="mt-6 p-6">
        <h2 className="mb-1 font-display text-xl font-semibold">Budget ricerche email a pagamento (Icypeas)</h2>
        <p className="mb-4 text-sm text-ink-2">
          Email trovate questo mese: <span className="font-mono font-semibold">{used}</span>
          {budget !== null && <> su <span className="font-mono">{budget}</span></>} (compreso il tetto riservato alle ricerche in corso).
          Superato il budget, il motore usa solo le email trovate sui siti.
        </p>
        <form action={updateEnrichmentBudget} className="flex flex-wrap items-center gap-2">
          <div className="w-40"><Input name="budget" type="number" min="0" step="1" defaultValue={budget ?? ""} placeholder="Nessun limite" aria-label="Email al mese" /></div>
          <Button size="sm" variant="secondary">Salva</Button>
          <p className="text-xs text-muted">Email al mese. Vuoto = nessun limite, 0 = spento. Tienilo sotto i crediti mensili del tuo piano Icypeas.</p>
        </form>
      </Card>
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">Piani</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2/60 text-xs uppercase text-muted"><tr><th className="px-4 py-2">Piano</th><th className="px-4 py-2">Prezzo</th><th className="px-4 py-2">Crediti</th><th className="px-4 py-2">€/credito</th><th className="px-4 py-2">Max lead/ricerca</th><th className="px-4 py-2">Arricchimento/giro</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(plans ?? []).map((p) => (
              <tr key={p.id}><td className="px-4 py-2">{p.name}</td><td className="px-4 py-2 font-mono">{formatEur(p.price_cents)}</td><td className="px-4 py-2 font-mono">{p.credits}</td><td className="px-4 py-2 font-mono">{p.credits ? (p.price_cents / p.credits / 100).toFixed(3) : "—"}</td><td className="px-4 py-2 font-mono">{p.max_quantity_per_search}</td><td className="px-4 py-2 font-mono">{p.enrichment_per_run_max}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
