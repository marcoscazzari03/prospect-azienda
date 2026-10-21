// Identità del prodotto: un solo punto da cambiare per il rebranding.
// Nome e indirizzi del prodotto: al cambio di nome si cambiano qui (più logo in src/components/logo.tsx e public/email/logo.png,
// EMAIL_FROM e APP_URL su Vercel, n8n/annunci/build.mjs e HOST_APP nel motore; elenco nel punto 67 della checklist).
export const BRAND = {
  name: "Webora Leads",
  short: "Webora",
  suffix: " Leads", // seconda parte del logo, in verde (vuota con un nome di una parola)
  tagline: "Trova aziende in target e scopri nuove opportunità commerciali verificate",
  owner: "Webora Studio",
  supportEmail: "leads@weborastudio.it",
  domain: "leads.weborastudio.it",
} as const;

// Beta su invito (dal 19/10): fascia sul sito e testi della registrazione. A fine beta: open = false.
export const BETA = {
  open: true,
  banner: "Beta gratuita su invito: 4 settimane, crediti gratuiti, nessuna carta.",
  signupHref: "/registrati?beta=1",
} as const;

// Regole operative della ricerca.
export const SEARCH_RULES = {
  maxAttempts: 5, // primo giro + 4 top-up (di più per le ricerche grandi, vedi maxAttemptsFor)
  // Budget del motore per ricerca (AI, arricchimento, verifiche): oltre, niente altri giri.
  // Collaudi del 17/10: con il limite fisso di 3 giri le ricerche chiudevano a 3/5 con
  // centinaia di aziende ancora da provare; il limite giusto è la spesa, non i giri.
  engineBudgetPerLeadEur: 0.2,
  engineBudgetMinEur: 1,
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
