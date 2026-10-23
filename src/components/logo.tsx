import Link from "next/link";
import { BRAND, BRAND_KEY } from "@/lib/config";

// Simbolo del marchio (viewBox 32×32). Avvisto, logo provvisorio del 23/10: una «A» con un punto ambra in alto, la cosa
// «avvistata». Usato anche dall'icona del browser (src/app/icon.tsx) e per il logo delle email (public/email/).
export function LogoMark({ className = "h-7 w-7", size }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" className={className} width={size} height={size} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#22a06b" />
      {BRAND_KEY === "avvisto" ? (
        <>
          <path d="M9.5 24l6.5-15 6.5 15" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.4 18.6h7.2" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="24" cy="8.5" r="2.9" fill="#ffc53d" stroke="#22a06b" strokeWidth="1.2" />
        </>
      ) : (
        <path d="M7.5 10.5l3.6 11 4.9-8.6 4.9 8.6 3.6-11" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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
