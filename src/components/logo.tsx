import Link from "next/link";
import { BRAND } from "@/lib/config";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#22a06b" />
      <path d="M7.5 10.5l3.6 11 4.9-8.6 4.9 8.6 3.6-11" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={BRAND.name}>
      <LogoMark />
      <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
        {BRAND.short}
        <span className="text-ledger"> Leads</span>
      </span>
    </Link>
  );
}
