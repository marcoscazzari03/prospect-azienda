import Link from "next/link";
import { formatNumber } from "@/lib/domain/pricing";

// Iniziali per l'avatar (nome, altrimenti la parte prima della @).
export function initialsOf(fullName: string | undefined, email: string) {
  const name = (fullName ?? "").trim();
  return (name ? name.split(/\s+/).map((w) => w[0]) : email.split("@")[0].match(/[a-z]/gi) ?? ["?"]).slice(0, 2).join("").toUpperCase();
}

// Piede della barra laterale (bozza del 23/10): piano e crediti disponibili, porta a «Crediti e piano». Profilo e uscita
// sono nel menu dell'avatar in alto a destra (header-account.tsx) e nella pagina dell'account.
export function PlanCard({ planName, credits }: { planName: string; credits: number }) {
  return (
    <Link href="/app/crediti" className="group flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-ink-2/30">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-soft text-orange">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
          <path d="M3 7l3.5 3L10 4l3.5 6L17 7l-1.5 8h-11zM4.5 17.5h11" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-2">Piano {planName}</span>
        <span className="block truncate text-[13px] text-muted">{formatNumber(credits)} crediti disponibili</span>
      </span>
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M8 5l5 5-5 5" />
      </svg>
    </Link>
  );
}
