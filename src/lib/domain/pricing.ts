import { MODE_INFO, type EmailMode } from "./catalog";

// Stima mostrata nel wizard: si riserva il massimo, si addebita il consumato.
// `extra`: crediti in più per lead con segnale (vedi signalExtraRange).
export function estimateCredits(mode: EmailMode, quantity: number, extra: number | { min: number; max: number } = 0) {
  const info = MODE_INFO[mode];
  const e = typeof extra === "number" ? { min: extra, max: extra } : extra;
  const max = (info.maxCredits + e.max) * quantity;
  return { min: (info.minCredits + e.min) * quantity, max, reserve: max };
}

// Resa delle aziende «da provare» (nessuna email né modulo noti; nelle ricerche da annunci anche siti non ancora
// controllati): quota che diventa un lead.
// Misurata il 22/10 (supabase/queries/resa_wizard.sql): nei giri degli ultimi 30 giorni il motore trova un contatto in
// circa il 60% delle aziende che prova, ma prova prima quelle con l'email già nota; per le altre si usa una forbice prudente.
export const CONTACT_YIELD = { low: 0.3, high: 0.5 } as const;

export type AvailabilityContacts = { total: number; withEmail: number; formOnly: number; toTry: number };

// Lead attesi dalle aziende disponibili: quelle con l'email (e il modulo, se il cliente lo accetta) più una quota
// delle «da provare». Mai oltre i lead richiesti. Sotto 10 il numero esatto, sopra a multipli di 5.
export function expectedLeads(c: AvailabilityContacts, withForm: boolean, requested: number) {
  const known = c.withEmail + (withForm ? c.formOnly : 0);
  const round = (n: number, up: boolean) => (n < 10 ? Math.round(n) : (up ? Math.ceil(n / 5) : Math.floor(n / 5)) * 5);
  // Mai oltre le aziende che esistono (l'arrotondamento a 5 non deve aggiungerne: 11 aziende non fanno «10–15»).
  const max = Math.min(requested, known + c.toTry, round(known + c.toTry * CONTACT_YIELD.high, true));
  // Nessuna azienda da provare: il numero è certo, niente forbice.
  const min = c.toTry === 0 ? max : Math.min(max, round(known + c.toTry * CONTACT_YIELD.low, false));
  // Oltre 500 aziende la funzione SQL ne conta solo 501: il totale vero è più alto, il massimo non ha tetto.
  if (c.total > 500) return { min, max: requested };
  return { min, max };
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
