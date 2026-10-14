"use client";
import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/domain/pricing";
import { SEARCH_STATUS_LABEL, cx } from "./ui";
import { SearchTable, isOpportunity, searchZone, type SearchListItem } from "./search-table";

const PERIODS = [
  ["all", "Sempre", 0],
  ["7", "Ultimi 7 giorni", 7],
  ["30", "Ultimi 30 giorni", 30],
  ["90", "Ultimi 90 giorni", 90],
] as const;
const SORTS = [
  ["recent", "Più recenti"],
  ["oldest", "Meno recenti"],
  ["leads", "Più lead"],
  ["credits", "Più crediti"],
] as const;

const KPI_ICONS = {
  doc: "M5 2.5h6.5l3.5 3.5v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5",
  check: "M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM6.75 10.25l2.25 2.25 4.25-4.75",
  users: "M7 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM13.5 8.5a2 2 0 1 0 0-4M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5M13.5 11.5c2.2 0 4 1.7 4 4.5",
  coins: "M10 8.5c3.3 0 6-1.1 6-2.5S13.3 3.5 10 3.5 4 4.6 4 6s2.7 2.5 6 2.5zM4 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6M4 10v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4",
} as const;

function Kpi({ icon, tone, label, value, note }: { icon: keyof typeof KPI_ICONS; tone: string; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-line bg-card p-5">
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone)}>
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={KPI_ICONS[icon]} />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-2">{label}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold">{value}</p>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}

const SELECT = "h-10 rounded-lg border border-line bg-white px-3 text-sm focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/15";

export function SearchesBrowser({ searches }: { searches: SearchListItem[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "target" | "opportunity">("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("recent");
  const [now] = useState(() => Date.now());

  const completed = searches.filter((s) => s.status === "completed").length;
  const leads = searches.reduce((a, s) => a + s.delivered, 0);
  const credits = searches.reduce((a, s) => a + s.credits_charged, 0);
  const statuses = [...new Set(searches.map((s) => s.status))];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const days = PERIODS.find(([k]) => k === period)?.[2] ?? 0;
    const list = searches.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q) || searchZone(s).toLowerCase().includes(q)) &&
        (kind === "all" || (kind === "opportunity") === isOpportunity(s)) &&
        (status === "all" || s.status === status) &&
        (!days || now - Date.parse(s.created_at) <= days * 86_400_000),
    );
    const by: Record<typeof sort, (a: SearchListItem, b: SearchListItem) => number> = {
      recent: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      leads: (a, b) => b.delivered - a.delivered,
      credits: (a, b) => b.credits_charged - a.credits_charged,
    };
    return [...list].sort(by[sort]);
  }, [searches, query, kind, status, period, sort, now]);

  const filtered = query.trim() !== "" || kind !== "all" || status !== "all" || period !== "all";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="doc" tone="bg-ledger-soft text-ledger" label="Ricerche totali" value={formatNumber(searches.length)} />
        <Kpi icon="check" tone="bg-ledger-soft text-ledger" label="Completate" value={formatNumber(completed)} note={searches.length ? `${Math.round((completed / searches.length) * 100)}% del totale` : undefined} />
        <Kpi icon="users" tone="bg-sky-50 text-sky-700" label="Lead trovati" value={formatNumber(leads)} />
        <Kpi icon="coins" tone="bg-stamp-soft text-stamp-ink" label="Crediti consumati" value={formatNumber(credits)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca una ricerca o una zona…"
            aria-label="Cerca una ricerca"
            className={cx(SELECT, "w-full pl-9 placeholder:text-muted/70")}
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tipo" className={SELECT}>
          <option value="all">Tutti i tipi</option>
          <option value="target">Target</option>
          <option value="opportunity">Opportunità</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Stato" className={SELECT}>
          <option value="all">Tutti gli stati</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{SEARCH_STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} aria-label="Periodo" className={SELECT}>
          {PERIODS.map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordina" className={cx(SELECT, "lg:ml-auto")}>
          {SORTS.map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </div>

      {shown.length ? (
        <SearchTable searches={shown} />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-card px-6 py-10 text-center text-sm text-ink-2">
          Nessuna ricerca con questi filtri.
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKind("all");
                setStatus("all");
                setPeriod("all");
              }}
              className="ml-2 font-medium text-ledger underline"
            >
              Togli i filtri
            </button>
          )}
        </div>
      )}
    </div>
  );
}
