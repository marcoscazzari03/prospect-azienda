import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, PageHeader, SearchStatus } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { closeSearch } from "../actions";
import { requireAdmin } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Ricerche e motore" };

export default async function AdminSearches({ searchParams }: PageProps<"/admin/ricerche">) {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const { id } = await searchParams;
  const db = createAdminClient();
  const n8n = env.n8nBaseUrl();
  const { data: searches } = await db
    .from("searches")
    .select("id, name, status, email_mode, quantity, delivered, credits_reserved, credits_charged, attempts, error, created_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const selected = typeof id === "string" ? id : null;
  const [{ data: runs }, { data: events }, { data: costs }] = selected
    ? await Promise.all([
        db.from("search_runs").select("id, attempt, status, requested, stats, usage, n8n_execution_id, error, created_at, finished_at").eq("search_id", selected).order("attempt"),
        db.from("search_events").select("id, stage, message, created_at").eq("search_id", selected).order("created_at"),
        db.from("run_costs").select("run_id, provider, units, total_eur, search_runs!inner(search_id)").eq("search_runs.search_id", selected),
      ])
    : [{ data: null }, { data: null }, { data: null }];
  const totalCost = (costs ?? []).reduce((s, c) => s + Number(c.total_eur), 0);

  return (
    <>
      <PageHeader title="Ricerche e motore" description="Tutte le ricerche dei clienti, i giri del motore n8n, errori e costi." />
      {selected && (
        <Card className="mb-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Dettaglio ricerca</h2>
            <Link href="/admin/ricerche" className="text-sm text-ledger underline">Chiudi</Link>
          </div>
          <p className="mb-2 text-sm">Costo stimato: <span className="font-mono">{totalCost.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span></p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-muted"><tr><th className="py-2">Giro</th><th>Stato</th><th>Richiesti</th><th>Statistiche</th><th>n8n</th></tr></thead>
              <tbody className="divide-y divide-line">
                {(runs ?? []).map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 font-mono">{r.attempt}</td>
                    <td><Badge tone={r.status === "completed" ? "ledger" : r.status.includes("fail") ? "brick" : "stamp"}>{r.status}</Badge>{r.error && <p className="text-xs text-brick">{r.error}</p>}</td>
                    <td className="font-mono">{r.requested}</td>
                    <td><pre className="max-w-md overflow-x-auto whitespace-pre-wrap text-[11px] text-ink-2">{r.stats ? JSON.stringify({ ...(r.stats as Record<string, unknown>), usage: r.usage }, null, 1) : "—"}</pre></td>
                    <td>{r.n8n_execution_id && n8n ? <a className="text-ledger underline" target="_blank" rel="noopener noreferrer" href={`${n8n}/workflow/executions/${r.n8n_execution_id}`}>#{r.n8n_execution_id}</a> : r.n8n_execution_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="mt-4 flex flex-col gap-1 text-xs text-ink-2">
            {(events ?? []).map((e) => <li key={e.id}><span className="font-mono text-muted">{new Date(e.created_at).toLocaleTimeString("it-IT")}</span> · {e.stage} · {e.message}</li>)}
          </ol>
        </Card>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Ricerca</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Stato</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Crediti</th><th className="px-4 py-3">Giri</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(searches ?? []).map((s) => (
              <tr key={s.id} className="align-top hover:bg-paper/60">
                <td className="px-4 py-3"><Link href={`?id=${s.id}`} className="font-medium hover:text-ledger">{s.name}</Link><p className="text-xs text-muted">{new Date(s.created_at).toLocaleString("it-IT")} · {s.email_mode}</p>{s.error && <p className="text-xs text-brick">{s.error}</p>}</td>
                <td className="px-4 py-3 text-ink-2">{(s.organizations as unknown as { name: string } | null)?.name}</td>
                <td className="px-4 py-3"><SearchStatus status={s.status} /></td>
                <td className="px-4 py-3 font-mono">{s.delivered}/{s.quantity}</td>
                <td className="px-4 py-3 font-mono">{s.credits_charged}/{s.credits_reserved}</td>
                <td className="px-4 py-3 font-mono">{s.attempts}</td>
                <td className="px-4 py-3">
                  {["queued", "running"].includes(s.status) && (
                    <form action={closeSearch}><input type="hidden" name="searchId" value={s.id} /><Button size="sm" variant="secondary">Chiudi e rimborsa</Button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
