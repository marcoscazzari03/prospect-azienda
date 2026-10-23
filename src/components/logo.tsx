import Link from "next/link";
import { BRAND } from "@/lib/config";

// Simbolo di Avvisto (scelto dall'utente il 23/10, proposta «C · Due toni»): una A senza barra, gamba sinistra viola chiaro,
// gamba destra viola scuro che passa in una lente d'ingrandimento. viewBox 64×64; light: per gli sfondi scuri. Usato anche
// dall'icona del browser (src/app/icon.tsx); il PNG delle email (public/email/logo-avvisto.png) è lo stesso disegno.
export function LogoMark({ className = "h-7 w-7", size, light = false }: { className?: string; size?: number; light?: boolean }) {
  const left = light ? "#b3a8f2" : "#6d5ce8";
  const right = light ? "#ffffff" : "#362793";
  return (
    <svg viewBox="0 0 64 64" className={className} width={size} height={size} aria-hidden>
      <path d="M10 58 L32 8" stroke={left} strokeWidth="9" strokeLinecap="round" />
      <path d="M32 8 L41 28.5" stroke={right} strokeWidth="9" strokeLinecap="round" />
      <circle cx="45.6" cy="39" r="8" fill="none" stroke={right} strokeWidth="6" />
      <path d="M50.3 49.5 L54 58" stroke={right} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

// Scritta come nella bozza (23/10): senza grazie, in grassetto, tutta in nero («Avvisto.it»); size="lg" nel menu dell'app.
export function Logo({ href = "/", size = "md", light = false }: { href?: string; size?: "md" | "lg"; light?: boolean }) {
  return (
    <Link href={href} className={size === "lg" ? "flex items-center gap-2 md:gap-2.5" : "flex items-center gap-2"} aria-label={BRAND.name}>
      <LogoMark light={light} className={size === "lg" ? "h-9 w-9 md:h-11 md:w-11" : "h-7 w-7"} />
      <span className={`whitespace-nowrap font-bold tracking-tight ${light ? "text-paper" : "text-ink"} ${size === "lg" ? "text-2xl leading-none md:text-[30px]" : "text-xl"}`}>
        {BRAND.short}
        {BRAND.suffix}
      </span>
    </Link>
  );
}
