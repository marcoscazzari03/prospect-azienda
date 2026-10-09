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
  maxAttempts: 3, // primo giro + 2 top-up
  staleRunMinutes: 45, // un giro senza eventi da più di così è considerato fallito
  autoRefundWindowDays: 14,
  bounceRefundWindowDays: 30,
  autoRefundMaxShare: 0.1, // rimborsi automatici fino al 10% dei lead di una ricerca
} as const;
