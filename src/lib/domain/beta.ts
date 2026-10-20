// Metriche della beta (decisione del 20/10): per ogni cliente quanto usa davvero il servizio.
// L'export è il segnale d'intenzione più forte; gli stati «ha risposto / incontro / cliente»
// che il cliente imposta sui lead misurano l'esito del contatto.

export const BETA_START = "2026-10-19";

// Soglie fissate prima della decisione sulla seconda ondata (28/10).
export const BETA_THRESHOLDS = {
  minSearches: 2, // uso reale: almeno 2 ricerche
  maxReportShare: 0.1, // lead segnalati sotto il 10%
  goExporters: 2, // via libera se almeno 2 clienti esportano…
  goResponders: 1, // …e almeno 1 ha una risposta da un'azienda contattata
} as const;

export type BetaOrgRow = {
  orgId: string;
  name: string;
  owner: string;
  plan: string;
  searches: number;
  delivered: number;
  exports: number;
  exportedRows: number;
  contacted: number; // contattati, con risposta o oltre
  responses: number; // ha risposto, incontro, cliente
  reports: number;
  lastActivity: string | null;
};

const REPLIED = new Set(["replied", "meeting", "won"]);
const CONTACTED = new Set(["contacted", "replied", "meeting", "won", "lost"]);

export function betaMetrics(input: {
  orgs: { id: string; name: string; plan_id: string }[];
  owners: Map<string, string>;
  searches: { org_id: string; created_at: string }[];
  deliveries: { org_id: string; stage: string | null; delivered_at: string }[];
  exports: { org_id: string; rows: number; created_at: string }[];
  reports: { org_id: string }[];
}): BetaOrgRow[] {
  const rows = new Map<string, BetaOrgRow>();
  for (const o of input.orgs) {
    rows.set(o.id, {
      orgId: o.id, name: o.name, owner: input.owners.get(o.id) ?? "", plan: o.plan_id,
      searches: 0, delivered: 0, exports: 0, exportedRows: 0, contacted: 0, responses: 0, reports: 0, lastActivity: null,
    });
  }
  const touch = (r: BetaOrgRow, at: string) => { if (!r.lastActivity || at > r.lastActivity) r.lastActivity = at; };
  for (const s of input.searches) { const r = rows.get(s.org_id); if (r) { r.searches++; touch(r, s.created_at); } }
  for (const d of input.deliveries) {
    const r = rows.get(d.org_id);
    if (!r) continue;
    r.delivered++;
    if (d.stage && CONTACTED.has(d.stage)) r.contacted++;
    if (d.stage && REPLIED.has(d.stage)) r.responses++;
  }
  for (const e of input.exports) { const r = rows.get(e.org_id); if (r) { r.exports++; r.exportedRows += e.rows; touch(r, e.created_at); } }
  for (const x of input.reports) { const r = rows.get(x.org_id); if (r) r.reports++; }
  return [...rows.values()].sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
}

export function betaVerdict(rows: BetaOrgRow[]) {
  const T = BETA_THRESHOLDS;
  const active = rows.filter((r) => r.searches > 0);
  const exporters = active.filter((r) => r.exports > 0).length;
  const responders = active.filter((r) => r.responses > 0).length;
  const delivered = active.reduce((a, r) => a + r.delivered, 0);
  const reports = active.reduce((a, r) => a + r.reports, 0);
  const reportShare = delivered ? reports / delivered : 0;
  return {
    active: active.length,
    exporters,
    responders,
    reportShare,
    go: exporters >= T.goExporters && responders >= T.goResponders && reportShare < T.maxReportShare,
  };
}
