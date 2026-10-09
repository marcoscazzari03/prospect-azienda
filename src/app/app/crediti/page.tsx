import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { Alert, Button, Card, PageHeader, Stat } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPublicPlans } from "@/lib/server/catalog";
import { stripeEnabled } from "@/lib/server/stripe";
import { formatEur, formatNumber } from "@/lib/domain/pricing";
import { buyPlan, openPortal } from "../actions";

export const metadata: Metadata = { title: "Crediti e piano" };

const KIND: Record<string, string> = {
  grant: "Regalo", purchase: "Acquisto", subscription: "Abbonamento", reserve: "Riserva ricerca",
  release: "Restituzione", refund: "Rimborso", adjust: "Rettifica", expire: "Scadenza",
};

export default async function CreditsPage({ searchParams }: PageProps<"/app/crediti">) {
  const viewer = await requireViewer();
  const { pagamento, piano } = await searchParams;
  const supabase = await createClient();
  const [plans, { data: lots }, { data: ledger }, { data: payments }, { data: sub }] = await Promise.all([
    getPublicPlans(),
    createAdminClient().rpc("credit_lots", { p_org: viewer.org.id }),
    supabase.from("credit_ledger").select("id, delta, kind, description, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("payments").select("id, kind, amount_cents, status, invoice_url, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("subscriptions").select("plan_id, status, current_period_end, cancel_at_period_end").maybeSingle(),
  ]);
  const billing = stripeEnabled();
  // Crediti non ancora usati raggruppati per giorno di scadenza (i più vicini prima).
  const expiring = Object.entries(
    (lots ?? [])
      .filter((l) => l.expires_at && l.remaining > 0 && new Date(l.expires_at) > new Date())
      .reduce<Record<string, number>>((acc, l) => {
        const day = new Date(l.expires_at).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
        acc[day] = (acc[day] ?? 0) + l.remaining;
        return acc;
      }, {}),
  ).slice(0, 3);

  return (
    <>
      <PageHeader title="Crediti e piano" description="Saldo, movimenti, acquisti e fatture." />
      {pagamento === "ok" && <div className="mb-6"><Alert tone="ledger">Pagamento ricevuto: i crediti compaiono qui appena Stripe conferma (di solito pochi secondi).</Alert></div>}
      {pagamento === "non-attivo" && <div className="mb-6"><Alert>I pagamenti online non sono ancora attivi. Scrivici per acquistare crediti.</Alert></div>}
      {typeof piano === "string" && piano && <div className="mb-6"><Alert>Hai scelto il piano «{plans.find((p) => p.id === piano)?.name ?? piano}»: completa l&apos;acquisto qui sotto.</Alert></div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Crediti disponibili"
          value={formatNumber(viewer.credits)}
          tone="ledger"
          hint={expiring.length ? expiring.map(([day, n]) => `${formatNumber(n)} scadono il ${day}`).join(" · ") : undefined}
        />
        <Stat label="Piano attuale" value={viewer.plan?.name ?? "—"} hint={sub ? `Abbonamento ${sub.status}${sub.current_period_end ? ` · rinnovo ${new Date(sub.current_period_end).toLocaleDateString("it-IT")}` : ""}${sub.cancel_at_period_end ? " · annullato a fine periodo" : ""}` : undefined} />
        <Card className="flex flex-col justify-between p-5">
          <p className="text-sm text-muted">Fatture, metodo di pagamento, disdetta</p>
          <form action={openPortal}>
            <Button variant="secondary" className="mt-3 w-full" disabled={!billing || !viewer.org.stripe_customer_id}>Gestisci su Stripe</Button>
          </form>
        </Card>
      </div>

      <div className="mt-12">
        <PricingTable
          plans={plans}
          currentPlanId={viewer.plan?.id}
          action={(p) => (
            <form action={buyPlan}>
              <input type="hidden" name="planId" value={p.id} />
              <Button className="w-full" variant={p.highlighted || p.id === piano ? "primary" : "secondary"} disabled={!billing || (p.kind === "subscription" && p.id === viewer.plan?.id)}>
                {p.kind === "subscription" ? (p.id === viewer.plan?.id ? "Piano attivo" : `Passa a ${p.name}`) : `Acquista ${formatEur(p.price_cents)}`}
              </Button>
            </form>
          )}
        />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Movimenti</h2>
          <Card className="divide-y divide-line">
            {(ledger ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{l.description || KIND[l.kind]}</p>
                  <p className="text-xs text-muted">{KIND[l.kind] ?? l.kind} · {new Date(l.created_at).toLocaleString("it-IT")}</p>
                </div>
                <p className={`shrink-0 font-mono ${l.delta >= 0 ? "text-ledger" : "text-ink-2"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</p>
              </div>
            ))}
            {!ledger?.length && <p className="px-4 py-6 text-sm text-muted">Nessun movimento.</p>}
          </Card>
        </section>
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Pagamenti</h2>
          <Card className="divide-y divide-line">
            {(payments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p>{p.kind === "pack" ? "Pacchetto crediti" : "Abbonamento"}</p>
                  <p className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString("it-IT")} · {p.status}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono">{formatEur(p.amount_cents)}</p>
                  {p.invoice_url && <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ledger underline">Ricevuta</a>}
                </div>
              </div>
            ))}
            {!payments?.length && <p className="px-4 py-6 text-sm text-muted">Nessun pagamento.</p>}
          </Card>
        </section>
      </div>
    </>
  );
}
