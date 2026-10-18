import type { SignalPrices } from "@/lib/domain/signals";

// Tipi di ricerca mostrati nei calcolatori dei prezzi (modalità «Solo azienda»):
// crediti per azienda consegnata, minimo e massimo.
export type SearchType = "target" | "extended" | "opportunity";

export const SEARCH_TYPES: { type: SearchType; label: string; text: string }[] = [
  { type: "target", label: "In target", text: "Aziende per settore e zona dal nostro database, con sito ed email aziendale." },
  { type: "extended", label: "Ricerca estesa", text: "Con dimensione, fatturato, parole chiave o paesi esteri cerchiamo aziende nuove sul web e le controlliamo una per una." },
  { type: "opportunity", label: "Con opportunità", text: "Solo aziende con un segnale verificato legato al tuo servizio, con la prova." },
];

export function creditsPerLead(type: SearchType, prices: SignalPrices) {
  if (type === "target") return { min: 1, max: 1 };
  if (type === "extended") return { min: 2, max: 2 };
  return { min: 1 + Math.min(prices.website, prices.job_ad), max: 1 + Math.max(prices.website, prices.job_ad) };
}
