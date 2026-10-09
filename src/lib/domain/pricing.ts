import { MODE_INFO, type EmailMode } from "./catalog";

// Stima mostrata nel wizard: si riserva il massimo, si addebita il consumato.
export function estimateCredits(mode: EmailMode, quantity: number) {
  const info = MODE_INFO[mode];
  return { min: info.minCredits * quantity, max: info.maxCredits * quantity, reserve: info.maxCredits * quantity };
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
