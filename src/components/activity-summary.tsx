import Link from "next/link";
import { Card, cx } from "./ui";
import type { ActivityItem } from "@/lib/server/activity";

type Summary = { leads: number; creditsUsed: number; completed: number; failed: number; creditsAdded: number; creditsExpired: number };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("it-IT")} ${n === 1 ? one : many}`;

export function ActivitySummary({ since, summary, items }: { since: string; summary: Summary; items: ActivityItem[] }) {
  const chips = [
    summary.leads > 0 && { text: plural(summary.leads, "lead consegnato", "lead consegnati"), tone: "ledger" },
    summary.completed > 0 && { text: plural(summary.completed, "ricerca conclusa", "ricerche concluse"), tone: "ledger" },
    summary.failed > 0 && { text: plural(summary.failed, "ricerca non riuscita", "ricerche non riuscite"), tone: "brick" },
    summary.creditsUsed > 0 && { text: plural(summary.creditsUsed, "credito utilizzato", "crediti utilizzati"), tone: "ink" },
    summary.creditsAdded > 0 && { text: `+${plural(summary.creditsAdded, "credito aggiunto", "crediti aggiunti")}`, tone: "ledger" },
    summary.creditsExpired > 0 && { text: plural(summary.creditsExpired, "credito scaduto", "crediti scaduti"), tone: "stamp" },
  ].filter(Boolean) as { text: string; tone: string }[];

  return (
    <Card className="ruled p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Dall&apos;ultimo accesso</h2>
        <p className="text-xs text-muted">dal {fmtDate(since)}</p>
      </div>
      {chips.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c.text}
              className={cx(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
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
      ) : (
        <p className="mt-3 text-sm text-ink-2">Nessuna novità: le ricerche in corso e i nuovi lead compariranno qui.</p>
      )}

      {items.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-medium uppercase tracking-wider text-muted">Attività recenti</h3>
          <ol className="mt-2 divide-y divide-line">
            {items.map((it, i) => {
              const nuovo = it.at > since;
              const body = (
                <span className="flex items-start gap-3 py-2.5 text-sm">
                  <span
                    aria-hidden
                    className={cx(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      it.tone === "ledger" && "bg-ledger-bright",
                      it.tone === "stamp" && "bg-stamp",
                      it.tone === "brick" && "bg-brick",
                      it.tone === "ink" && "bg-muted",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cx(nuovo ? "font-medium text-ink" : "text-ink-2")}>{it.text}</span>
                    {nuovo && <span className="ml-2 rounded bg-ledger-soft px-1.5 py-0.5 text-[11px] font-medium text-ledger-2">nuovo</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{fmtDate(it.at)}</span>
                </span>
              );
              return (
                <li key={`${it.at}-${i}`}>
                  {it.href ? <Link href={it.href} className="block hover:bg-paper/60">{body}</Link> : body}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Card>
  );
}
