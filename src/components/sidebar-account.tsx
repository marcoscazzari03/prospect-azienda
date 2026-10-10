import Link from "next/link";
import { formatNumber } from "@/lib/domain/pricing";

// Piede della barra laterale: crediti con barra di utilizzo, account e uscita.
const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|libero|virgilio|tiscali|alice|tim|aol|proton|protonmail)\.[a-z.]+$/i;

export function SidebarAccount({ credits, total, planName, email, orgName }: { credits: number; total: number; planName: string; email: string; orgName: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((credits / total) * 100)) : 0;
  const initials = (email.split("@")[0].match(/[a-z]/gi) ?? ["?"]).slice(0, 2).join("").toUpperCase();
  const account = FREE_MAIL.test(orgName) ? "Account personale" : orgName;
  return (
    <div className="flex flex-col gap-3 border-t border-line p-4">
      <Link href="/app/crediti" className="group rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:border-ink-2/40">
        <span className="flex items-center justify-between text-sm text-muted">
          Crediti disponibili
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-2 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M8 5l5 5-5 5" />
          </svg>
        </span>
        <span className="mt-1 block font-mono text-3xl font-semibold text-ledger">{formatNumber(credits)}</span>
        {total > 0 && (
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={credits} aria-valuemax={total} aria-label="Crediti rimasti">
            <span className="block h-full rounded-full bg-ledger-bright" style={{ width: `${pct}%` }} />
          </span>
        )}
        <span className="mt-2 block text-xs text-ink-2">
          {total > 0 ? (
            <>
              <span className="font-mono font-semibold">{formatNumber(credits)}</span> di <span className="font-mono">{formatNumber(total)}</span> crediti disponibili
            </>
          ) : (
            "Nessun credito attivo"
          )}
        </span>
        <span className="mt-0.5 block text-xs text-muted">Piano {planName}</span>
      </Link>

      <details className="group/acc relative">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper-2 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-xs font-semibold text-ink-2">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium" title={email}>{email}</span>
            <span className="block truncate text-xs text-muted">{account}</span>
          </span>
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-2 transition-transform group-open/acc:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M5 8l5 5 5-5" />
          </svg>
        </summary>
        <div className="mt-1 flex flex-col rounded-lg border border-line bg-white p-1 text-sm">
          <Link href="/app/crediti" className="rounded-md px-3 py-2 hover:bg-paper-2">Crediti, piano e fatture</Link>
          <Link href="/nuova-password" className="rounded-md px-3 py-2 hover:bg-paper-2">Cambia password</Link>
          <a href="mailto:leads@weborastudio.it" className="rounded-md px-3 py-2 hover:bg-paper-2">Assistenza</a>
        </div>
      </details>

      <form action="/auth/esci" method="post">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12 6l4 4-4 4M16 10H8" />
          </svg>
          Esci
        </button>
      </form>
    </div>
  );
}
