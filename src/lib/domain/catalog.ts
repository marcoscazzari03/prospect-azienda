// Opzioni del wizard di ricerca (testi per l'utente in italiano).

export const EMAIL_MODES = ["generic_ok", "mixed", "personal_only"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];

export const MODE_INFO: Record<EmailMode, { label: string; short: string; maxCredits: number; minCredits: number; example: string }> = {
  generic_ok: {
    label: "Email generiche incluse",
    short: "Nominative quando le troviamo, altrimenti info@ o sales@ dell'azienda.",
    minCredits: 1,
    maxCredits: 2,
    example: "info@azienda.it · mario.rossi@azienda.it",
  },
  mixed: {
    label: "Mista",
    short: "Insistiamo sulle nominative (anche con verifica tecnica), poi accettiamo le generiche.",
    minCredits: 1,
    maxCredits: 3,
    example: "mario.rossi@azienda.it, se manca info@azienda.it",
  },
  personal_only: {
    label: "Solo nominative",
    short: "Solo email riferibili alla persona: trovate sul sito o verificate.",
    minCredits: 2,
    maxCredits: 3,
    example: "mario.rossi@azienda.it",
  },
};

export const COUNTRIES = [
  ["IT", "Italia"], ["ES", "Spagna"], ["PT", "Portogallo"], ["FR", "Francia"], ["DE", "Germania"],
  ["AT", "Austria"], ["CH", "Svizzera"], ["BE", "Belgio"], ["NL", "Paesi Bassi"], ["LU", "Lussemburgo"],
  ["GB", "Regno Unito"], ["IE", "Irlanda"], ["DK", "Danimarca"], ["SE", "Svezia"], ["NO", "Norvegia"],
  ["FI", "Finlandia"], ["PL", "Polonia"], ["CZ", "Repubblica Ceca"], ["SK", "Slovacchia"], ["HU", "Ungheria"],
  ["RO", "Romania"], ["BG", "Bulgaria"], ["GR", "Grecia"], ["HR", "Croazia"], ["SI", "Slovenia"],
  ["MT", "Malta"], ["CY", "Cipro"], ["EE", "Estonia"], ["LV", "Lettonia"], ["LT", "Lituania"],
  ["US", "Stati Uniti"], ["CA", "Canada"], ["AE", "Emirati Arabi Uniti"], ["AU", "Australia"],
] as const;
export const COUNTRY_NAME: Record<string, string> = Object.fromEntries(COUNTRIES);

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const ROLE_PRESETS = [
  "Titolare / CEO",
  "Fondatore",
  "Managing Director",
  "Direttore commerciale",
  "Direttore marketing",
  "Responsabile HR",
  "Responsabile IT / CTO",
  "Responsabile acquisti",
  "CFO / Amministrazione",
  "Partner",
] as const;
