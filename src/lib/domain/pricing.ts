import { MODE_INFO, type EmailMode } from "./catalog";

// Stima mostrata nel wizard: si riserva il massimo, si addebita il consumato.
// `extra`: crediti in più per lead con segnale (vedi signalExtraRange).
export function estimateCredits(mode: EmailMode, quantity: number, extra: number | { min: number; max: number } = 0) {
  const info = MODE_INFO[mode];
  const e = typeof extra === "number" ? { min: extra, max: extra } : extra;
  const max = (info.maxCredits + e.max) * quantity;
  return { min: (info.minCredits + e.min) * quantity, max, reserve: max };
}

export function formatEur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("it-IT").format(n);
}

export function pricePerCredit(priceCents: number, credits: number) {
  return credits > 0 ? priceCents / credits : 0;
}
