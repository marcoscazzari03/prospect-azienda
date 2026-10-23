import Link from "next/link";
import { BRAND, BRAND_KEY } from "@/lib/config";

// Simbolo del marchio (viewBox 32×32). Avvisto: il logo della bozza dell'utente (23/10, docs/design/avvisto/logo.png),
// ridisegnato: barra verticale e cuneo indaco, con il tratto lilla verso la barra. Usato anche dall'icona del browser
// (src/app/icon.tsx) e per il logo delle email (public/email/logo-avvisto.png).
export function LogoMark({ className = "h-7 w-7", size }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" className={className} width={size} height={size} aria-hidden>
      {BRAND_KEY === "avvisto" ? (
        <>
          <path d="M19.6 6.4 23.6 3.2a.6.6 0 0 1 1 .5v24.6a.6.6 0 0 1-1 .5l-4-3.2z" fill="#3730a3" />
          <path d="M14 15.6 18.6 12.4v6.2L14 21.6z" fill="#b3a8f2" />
          <path d="M4.6 21.4 14 15.6v6l-7.9 1.3a1 1 0 0 1-1.5-1.5z" fill="#3730a3" />
        </>
      ) : (
        <>
          <rect x="1" y="1" width="30" height="30" rx="8" fill="#22a06b" />
          <path d="M7.5 10.5l3.6 11 4.9-8.6 4.9 8.6 3.6-11" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={BRAND.name}>
      <LogoMark />
      <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
        {BRAND.short}
        {BRAND.suffix && <span className="text-ledger">{BRAND.suffix}</span>}
      </span>
    </Link>
  );
}
