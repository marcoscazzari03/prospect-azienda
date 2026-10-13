// Identità del prodotto: un solo punto da cambiare per il rebranding.
export const BRAND = {
  name: "Webora Leads",
  short: "Webora",
  tagline: "Lead B2B con la fonte",
  owner: "Webora Studio",
  supportEmail: "leads@weborastudio.it",
  domain: "leads.weborastudio.it",
} as const;

// Regole operative della ricerca.
export const SEARCH_RULES = {
  maxAttempts: 3, // primo giro + 2 top-up (di più per le ricerche grandi, vedi maxAttemptsFor)
  staleRunMinutes: 45, // un giro senza eventi da più di così è considerato fallito
  autoRefundWindowDays: 14,
  bounceRefundWindowDays: 30,
  autoRefundMaxShare: 0.1, // rimborsi automatici fino al 10% dei lead di una ricerca
  warehouseMaxAgeDays: 180, // il magazzino consegna solo contatti verificati negli ultimi N giorni
} as const;

// Limiti d'uso per account (V12): bloccano script e abusi, invisibili per un uso normale.
export const RATE_LIMITS = {
  searchesPerHour: 20, // nuove ricerche avviate a mano (le ripetizioni automatiche non contano)
  searchesPerDay: 60,
  exportsPerHour: 30, // per utente
  exportsPerDay: 200,
  reportsPerDay: 50, // segnalazioni di lead per organizzazione
} as const;
