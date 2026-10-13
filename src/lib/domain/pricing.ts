import { MODE_INFO, type EmailMode } from "./catalog";
import { SIGNAL_RULES } from "./signals";

// Stima mostrata nel wizard: si riserva il massimo, si addebita il consumato.
// Con un segnale verificato ogni lead costa 1 credito in più.
export function estimateCredits(mode: EmailMode, quantity: number, withSignal = false) {
  const info = MODE_INFO[mode];
  const extra = withSignal ? SIGNAL_RULES.extraCredits : 0;
  const max = (info.maxCredits + extra) * quantity;
  return { min: (info.minCredits + extra) * quantity, max, reserve: max };
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
