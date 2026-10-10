import Link from "next/link";
import type { ReactNode } from "react";
import { Card, cx } from "./ui";
import type { ActivityItem } from "@/lib/server/activity";
import { LEAD_STAGES, LEAD_STAGE_LABEL, type LeadStage } from "@/lib/domain/leads";
import { PERIODS, type Period } from "@/lib/server/dashboard";

// Elementi della panoramica del cliente.

const ICON: Record<string, string> = {
  coins: "M10 7c3.3 0 6-1.1 6-2.5S13.3 2 10 2 4 3.1 4 4.5 6.7 7 10 7zM4 4.5v4C4 9.9 6.7 11 10 11s6-1.1 6-2.5v-4M4 8.5v4C4 13.9 6.7 15 10 15s6-1.1 6-2.5v-4M4 12.5v3C4 16.9 6.7 18 10 18s6-1.1 6-2.5v-3",
  users: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 8c0-3 2.2-5 5-5s5 2 5 5M13 9a3 3 0 1 0 0-6M15 12c2 .5 3 2.4 3 5",
  clock: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 6v4l3 2",
  target: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM10 10.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z",
  check: "M4 10.5l4 4 8-9",
  alert: "M10 6v5M10 14h.01M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  flag: "M5 18V3M5 3h9l-2 3.5L14 10H5",
  download: "M10 3v10M6 9l4 4 4-4M4 17h12",
  repeat: "M4 8a6 6 0 0 1 10.5-3.5L16 6M16 2v4h-4M16 12a6 6 0 0 1-10.5 3.5L4 14M4 18v-4h4",
  list: "M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01",
  arrow: "M4 10h12M11 5l5 5-5 5",
};

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON[name]} />
    </svg>
  );
}

export function StatCard({ icon, label, value, hint, href, tone = "ink" }: { icon: keyof typeof ICON; label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "ink" | "ledger" | "stamp" }) {
  const body = (
    <Card className={cx("flex h-full items-start gap-4 p-5", href && "transition-colors hover:border-ink-2/30")}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ledger-soft text-ledger-2">
        <Icon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between text-sm text-muted">
          {label}
          {href && <Icon name="arrow" className="h-4 w-4 text-ink-2" />}
        </span>
        <span className={cx("mt-1 block font-mono text-3xl font-semibold tabular-nums", tone === "ledger" && "text-ledger", tone === "stamp" && "text-stamp-ink")}>{value}</span>
        {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      </span>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

// Una sola serie: barre sottili su scala da zero, griglia leggera, valore al passaggio del mouse.
export function LeadsChart({ days, period }: { days: { key: string; label: string; count: number }[]; period: Period }) {
  const max = Math.max(...days.map((d) => d.count), 0);
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const step = period === 7 ? 1 : period === 30 ? 5 : 15;
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Lead consegnati negli ultimi {period} giorni</h2>
          <p className="text-sm text-muted">{total.toLocaleString("it-IT")} in totale</p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-line p-1 text-sm" aria-label="Periodo">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/app?periodo=${p}`}
              scroll={false}
              aria-current={p === period ? "true" : undefined}
              className={cx("rounded-md px-3 py-1", p === period ? "bg-ledger text-white" : "text-ink-2 hover:bg-paper-2")}
            >
              {p} giorni
            </Link>
          ))}
        </nav>
      </div>

      <div className="relative mt-6 min-h-48 flex-1 pl-8">
        {[top, top / 2, 0].map((v) => (
          <div key={v} className="absolute left-8 right-0 border-t border-line" style={{ bottom: `${(v / top) * 100}%` }}>
            <span className="absolute -left-8 -top-2 w-6 text-right font-mono text-[11px] text-muted">{v}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-[2px]">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className={cx("w-full max-w-5 rounded-t-[4px]", d.count ? "bg-ledger-bright group-hover:bg-ledger" : "bg-transparent")}
                style={{ height: d.count ? `${Math.max((d.count / top) * 100, 2)}%` : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {d.label}: {d.count} lead
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex h-4 pl-8 font-mono text-[11px] text-muted">
        {days.map((d, i) => (
          <span key={d.key} className="relative flex-1">
            {i % step === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{d.label}</span>}
          </span>
        ))}
      </div>
    </Card>
  );
}

type Summary = { leads: number; creditsUsed: number; completed: number; failed: number; creditsAdded: number; creditsExpired: number };
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("it-IT")} ${n === 1 ? one : many}`;

export function ActivityCard({ since, summary, items }: { since: string; summary: Summary; items: ActivityItem[] }) {
  const chips = [
    summary.leads > 0 && { text: plural(summary.leads, "lead consegnato", "lead consegnati"), tone: "ledger" },
    summary.completed > 0 && { text: plural(summary.completed, "ricerca conclusa", "ricerche concluse"), tone: "ledger" },
    summary.failed > 0 && { text: plural(summary.failed, "non riuscita", "non riuscite"), tone: "brick" },
    summary.creditsUsed > 0 && { text: plural(summary.creditsUsed, "credito usato", "crediti usati"), tone: "ink" },
    summary.creditsAdded > 0 && { text: `+${plural(summary.creditsAdded, "credito", "crediti")}`, tone: "ledger" },
    summary.creditsExpired > 0 && { text: plural(summary.creditsExpired, "credito scaduto", "crediti scaduti"), tone: "stamp" },
  ].filter(Boolean) as { text: string; tone: string }[];

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Attività recenti</h2>
        <Link href="/app/ricerche" className="flex items-center gap-1 text-sm font-medium text-ledger hover:text-ledger-2">
          Vedi tutte <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
      {chips.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted">Dall&apos;ultimo accesso</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <li
                key={c.text}
                className={cx(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  c.tone === "ledger" && "border-ledger/20 bg-ledger-soft text-ledger-2",
                  c.tone === "brick" && "border-brick/20 bg-brick-soft text-brick",
                  c.tone === "stamp" && "border-stamp/30 bg-stamp-soft text-stamp-ink",
                  c.tone === "ink" && "border-line bg-white text-ink",
                )}
              >
                {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length ? (
        <ol className="mt-4 flex flex-col">
          {items.map((it, i) => {
            const nuovo = it.at > since;
            const icon = it.kind === "search" ? (it.tone === "brick" ? "alert" : it.tone === "ledger" ? "check" : "flag") : "coins";
            const body = (
              <span className="flex items-start gap-3 rounded-lg px-1 py-2.5">
                <span
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    it.tone === "ledger" && "bg-ledger-soft text-ledger-2",
                    it.tone === "stamp" && "bg-stamp-soft text-stamp-ink",
                    it.tone === "brick" && "bg-brick-soft text-brick",
                    it.tone === "ink" && "bg-paper-2 text-ink-2",
                  )}
                >
                  <Icon name={icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {it.title}
                    {nuovo && <span className="rounded bg-ledger-soft px-1.5 text-[10px] font-medium uppercase tracking-wide text-ledger-2">nuovo</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{it.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{it.when}</span>
              </span>
            );
            return <li key={`${it.at}-${i}`}>{it.href ? <Link href={it.href} className="block hover:bg-paper/70">{body}</Link> : body}</li>;
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-2">Qui compariranno le ricerche concluse e i movimenti di crediti.</p>
      )}
    </Card>
  );
}

const STAGE_TONE: Record<LeadStage, string> = {
  new: "bg-muted/40",
  contacted: "bg-ledger-bright/50",
  replied: "bg-ledger-bright/75",
  meeting: "bg-ledger-bright",
  won: "bg-ledger",
  lost: "bg-brick/50",
};

export function PipelineCard({ pipeline }: { pipeline: Record<LeadStage, number> }) {
  const total = LEAD_STAGES.reduce((s, k) => s + pipeline[k], 0);
  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">I tuoi contatti</h2>
        <Link href="/app/lead" className="flex items-center gap-1 text-sm font-medium text-ledger hover:text-ledger-2">
          Apri i lead <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">A che punto sei con i lead acquistati.</p>
      <ul className="mt-5 flex flex-col gap-3">
        {LEAD_STAGES.map((k) => {
          const n = pipeline[k];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={k}>
              <Link href={`/app/lead?fase=${k}`} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm hover:text-ledger">
                <span className="text-ink-2">{LEAD_STAGE_LABEL[k]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-paper-2">
                  <span className={cx("block h-full rounded-full", STAGE_TONE[k])} style={{ width: `${pct}%` }} />
                </span>
                <span className="text-right font-mono text-xs text-ink-2">
                  {n} <span className="text-muted">({pct}%)</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {total > 0 && pipeline.new === total && (
        <p className="mt-4 text-xs text-muted">Aggiorna lo stato dei contatti dalla pagina Lead: qui vedrai i progressi.</p>
      )}
    </Card>
  );
}

export function ToolsCard() {
  const tools = [
    { href: "/api/export?format=xlsx", icon: "download" as const, title: "Esporta lead", text: "Tutti i contatti in Excel", download: true },
    { href: "/app/ricerche/nuova", icon: "repeat" as const, title: "Ricerca ricorrente", text: "Nuovi lead ogni settimana o mese" },
    { href: "/app/lead", icon: "list" as const, title: "Le mie liste", text: "Organizza e annota i contatti" },
  ];
  return (
    <Card className="h-full p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">Strumenti</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tools.map((t) => {
          const inner = (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ledger-soft text-ledger-2">
                <Icon name={t.icon} className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-sm font-medium text-ink">{t.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{t.text}</span>
            </>
          );
          const cls = "block rounded-xl border border-line p-4 transition-colors hover:border-ledger/40 hover:bg-paper/60";
          return t.download ? (
            <a key={t.title} href={t.href} className={cls}>{inner}</a>
          ) : (
            <Link key={t.title} href={t.href} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </Card>
  );
}
