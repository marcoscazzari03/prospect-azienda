import Link from "next/link";
import { BRAND } from "@/lib/config";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#0f5c4d" />
      <path d="M8 11h16M8 16h16M8 21h9" stroke="#f6f3ec" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="21.5" r="4" fill="#e0a526" />
      <path d="M21.3 21.6l1.2 1.2 2.2-2.4" stroke="#141a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={BRAND.name}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">
        {BRAND.short}
        <span className="text-ledger"> Leads</span>
      </span>
    </Link>
  );
}
