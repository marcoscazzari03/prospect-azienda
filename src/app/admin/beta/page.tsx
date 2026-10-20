import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/dal";
import { BETA_START, BETA_THRESHOLDS as T, betaMetrics, betaVerdict } from "@/lib/domain/beta";

export const metadata: Metadata = { title: "Beta" };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }) : "—");

export default async function BetaPage({ searchParams }: PageProps<"/admin/beta">) {
  await requireAdmin();
  const { dal } = await searchParams;
  const from = typeof dal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dal) ? dal : BETA_START;
  const db = createAdminClient();
  // Gli account degli amministratori (prove interne) non contano.
  const [{ data: orgs }, { data: members }, { data: searches }, { data: deliveries }, { data: exports }, { data: reports }] = await Promise.all([
    db.from("organizations").select("id, name, plan_id").limit(1000),
    db.from("memberships").select("org_id, role, profiles:user_id(email, is_admin)").eq("role", "owner"),
    db.from("searches").select("org_id, created_at").gte("created_at", from).limit(20000),
    db.from("deliveries").select("org_id, stage, delivered_at").gte("delivered_at", from).is("deleted_at", null).limit(50000),
    db.from("exports").select("org_id, rows, created_at").gte("created_at", from).limit(20000),
    db.from("lead_reports").select("org_id").gte("created_at", from).limit(20000),
  ]);
  type Owner = { email: string; is_admin: boolean } | null;
  const adminOrgs = new Set((members ?? []).filter((m) => (m.profiles as unknown as Owner)?.is_admin).map((m) => m.org_id));
  const owners = new Map((members ?? []).map((m) => [m.org_id, (m.profiles as unknown as Owner)?.email ?? ""]));
  const rows = betaMetrics({
    orgs: (orgs ?? []).filter((o) => !adminOrgs.has(o.id)),
    owners,
    searches: searches ?? [],
    deliveries: deliveries ?? [],
    exports: exports ?? [],
    reports: reports ?? [],
  }).filter((r) => r.searches > 0 || r.delivered > 0);
  const v = betaVerdict(rows);

  return (
    <>
      <PageHeader
        eyebrow={`Dal ${day(from)}`}
        title="Beta: uso per cliente"
        description="Quanto ogni cliente usa davvero il servizio. L'export è il segnale d'intenzione più forte; le risposte sono gli stati che il cliente imposta sui lead («ha risposto», «incontro», «cliente»). Esclusi gli account degli amministratori."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Clienti attivi" value={v.active} hint="almeno una ricerca" />
        <Stat label="Hanno esportato" value={v.exporters} hint={`soglia: almeno ${T.goExporters}`} tone={v.exporters >= T.goExporters ? "ledger" : "ink"} />
        <Stat label="Con una risposta" value={v.responders} hint={`soglia: almeno ${T.goResponders}`} tone={v.responders >= T.goResponders ? "ledger" : "ink"} />
        <Stat label="Lead segnalati" value={`${Math.round(v.reportShare * 100)}%`} hint={`soglia: sotto il ${T.maxReportShare * 100}%`} tone={v.reportShare < T.maxReportShare ? "ledger" : "stamp"} />
      </div>

      <Card className="mt-4 p-5 text-sm">
        <p className="font-medium">
          Seconda ondata (Nord):{" "}
          {v.go ? <Badge tone="ledger">soglie raggiunte</Badge> : <Badge tone="stamp">soglie non ancora raggiunte</Badge>}
        </p>
        <p className="mt-2 text-ink-2">
          Regola decisa il 20/10: via libera se almeno {T.goExporters} clienti esportano lead, almeno {T.goResponders} ha una risposta
          da un&apos;azienda contattata e i lead segnalati restano sotto il {T.maxReportShare * 100}%. Le risposte che i clienti non
          segnano nell&apos;app vanno chieste a voce dopo una settimana. Se nessuno esporta, il problema non è il referente: il lead
          non è abbastanza pronto.
        </p>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Ricerche</th>
              <th className="px-4 py-3 text-right">Lead</th>
              <th className="px-4 py-3 text-right">Export</th>
              <th className="px-4 py-3 text-right">Righe esportate</th>
              <th className="px-4 py-3 text-right">Contattati</th>
              <th className="px-4 py-3 text-right">Risposte</th>
              <th className="px-4 py-3 text-right">Segnalati</th>
              <th className="px-4 py-3 text-right">Ultima attività</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Nessun cliente ha ancora usato il servizio in questo periodo.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.orgId} className="hover:bg-paper/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/clienti/${r.orgId}`} className="font-medium hover:text-ledger">{r.name}</Link>
                  <p className="text-xs text-muted">{r.owner} · {r.plan}</p>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${r.searches < T.minSearches ? "text-stamp-ink" : ""}`}>{r.searches}</td>
                <td className="px-4 py-3 text-right font-mono">{r.delivered}</td>
                <td className={`px-4 py-3 text-right font-mono ${r.exports ? "text-ledger" : "text-stamp-ink"}`}>{r.exports}</td>
                <td className="px-4 py-3 text-right font-mono">{r.exportedRows}</td>
                <td className="px-4 py-3 text-right font-mono">{r.contacted}</td>
                <td className={`px-4 py-3 text-right font-mono ${r.responses ? "text-ledger" : ""}`}>{r.responses}</td>
                <td className="px-4 py-3 text-right font-mono">{r.reports}</td>
                <td className="px-4 py-3 text-right text-muted">{day(r.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Periodo: aggiungi <code>?dal=AAAA-MM-GG</code> all&apos;indirizzo per cambiarlo.</p>
    </>
  );
}
