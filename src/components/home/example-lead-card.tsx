import { opportunityScore, signalByCode, signalPhrase } from "@/lib/domain/signals";
import { cx } from "../ui";
import type { ExampleLead } from "./examples";

// Numero di richiamo accanto a una parte della scheda.
function Mark({ n, show }: { n: number; show: boolean }) {
  return show ? <span aria-hidden className="mr-2 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink font-mono text-[10px] font-semibold text-white">{n}</span> : null;
}

// Scheda di un lead d'esempio, con le stesse informazioni che il cliente riceve davvero:
// azienda, perché è in target, il segnale con la prova, il punteggio, il contatto aziendale.
// `marks`: numeri dei richiami (sezione «Cosa ricevi»).
export function ExampleLeadCard({ lead, offer, marks = false, className }: { lead: ExampleLead; offer?: string; marks?: boolean; className?: string }) {
  const opp = opportunityScore(lead.signals, offer);
  return (
    <article className={cx("rounded-2xl border border-line bg-card text-left shadow-[0_24px_60px_-36px_rgba(17,24,39,0.45)]", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center font-semibold"><Mark n={1} show={marks} /><span className="truncate">{lead.company}</span></p>
          <p className="mt-0.5 text-sm text-muted">{lead.sector} · {lead.city}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Esempio</span>
      </header>

      <div className="px-5 py-4">
        <p className="flex items-center font-mono text-[11px] uppercase tracking-wider text-ledger"><Mark n={2} show={marks} />Perché contattarla</p>
        <ul className="mt-2 flex flex-col gap-2.5">
          {lead.signals.map((s) => (
            <li key={s.code} className="rounded-lg bg-paper px-3 py-2.5">
              <p className="text-sm font-medium">{signalByCode(s.code)?.label}</p>
              <p className="mt-0.5 text-xs text-ink-2" suppressHydrationWarning>{signalPhrase(s)}</p>
              <p className="mt-1 text-xs text-ledger">Prova: {s.code === "job_ad" ? "link all'annuncio" : "link alla pagina controllata"} ↗</p>
            </li>
          ))}
        </ul>
        {opp && (
          <div className="mt-3 flex items-center gap-3">
            <Mark n={3} show={marks} />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2" aria-hidden>
              <div className="h-full rounded-full bg-ledger transition-[width] duration-500" style={{ width: `${opp.score}%` }} />
            </div>
            <p className="shrink-0 text-xs text-ink-2">Opportunità <span className="font-medium text-ink">{opp.level}</span> · <span className="font-mono">{opp.score}</span>/100</p>
          </div>
        )}
      </div>

      <footer className="grid gap-3 border-t border-line px-5 py-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <p className="flex items-center text-xs text-muted"><Mark n={4} show={marks} />Contatto aziendale</p>
          <p className={cx("mt-1 truncate", lead.contact.kind === "email" ? "font-mono text-[13px]" : "text-ledger")}>{lead.contact.value}</p>
          <p className="text-xs text-muted">{lead.contact.kind === "email" ? "Trovata sul sito, con la pagina" : "Nessuna email pubblica sul sito"}</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center text-xs text-muted"><Mark n={5} show={marks} />Perché è in target</p>
          <p className="mt-1 text-ink-2">{lead.region} · {lead.size}</p>
          <p className="text-xs text-muted">Sito ufficiale e settore controllati</p>
        </div>
      </footer>
    </article>
  );
}
