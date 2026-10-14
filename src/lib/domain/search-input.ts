import { z } from "zod";
import { COMPANY_SIZES, COUNTRY_NAME, EMAIL_MODES } from "./catalog";
import { JOB_AD_COUNTRIES, JOB_FAMILIES, OFFERS, SIGNALS, SIGNAL_RULES, chargesSignal, toSignalsTarget } from "./signals";

const list = (max: number, itemMax = 80) =>
  z
    .array(z.string().trim().min(1).max(itemMax))
    .max(max)
    .transform((a) => [...new Set(a)]);

export const searchInputSchema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  industry: z.string().trim().min(3, "Descrivi il settore (almeno 3 caratteri)").max(200),
  industryKeywords: list(10),
  countries: list(10, 2)
    .refine((a) => a.length > 0, "Scegli almeno un paese")
    .refine((a) => a.every((c) => c in COUNTRY_NAME), "Paese non valido"),
  regions: list(10),
  companySizes: z.array(z.enum(COMPANY_SIZES)).max(COMPANY_SIZES.length).default([]),
  revenueRange: z.string().trim().max(60).optional().default(""),
  roles: list(10).refine((a) => a.length > 0, "Indica almeno un ruolo"),
  keywords: list(15),
  excludeKeywords: list(15),
  notes: z.string().trim().max(600).optional().default(""),
  emailMode: z.enum(EMAIL_MODES),
  quantity: z.coerce.number().int().min(1).max(1000),
  contactsPerCompany: z.coerce.number().int().min(1).max(3).default(1),
  repeat: z.enum(["none", "weekly", "monthly"]).default("none"),
  // Segnali di bisogno (docs/07-segnali.md): facoltativi.
  signals: z
    .object({
      codes: z.array(z.enum(SIGNALS.map((s) => s.code) as [string, ...string[]])).max(SIGNAL_RULES.maxSignalsPerSearch),
      match: z.enum(["any", "all"]).default("any"),
      jobFamilies: z.array(z.enum(JOB_FAMILIES.map((f) => f.code) as [string, ...string[]])).max(3).default([]),
      // Servizio venduto (ricerca opportunità): se presente, la regola dei segnali è la nostra.
      // La regola (codici, figure, combinazione) la mette il server dalle regole dei servizi.
      offer: z.enum(OFFERS.map((o) => o.code) as [string, ...string[]]).optional(),
      lookFor: z.string().trim().max(300).optional(),
    })
    .default({ codes: [], match: "any", jobFamilies: [] })
    .transform((s) => ({ ...s, codes: [...new Set(s.codes)], jobFamilies: [...new Set(s.jobFamilies)] }))
    .refine((s) => !s.codes.length || chargesSignal(s.codes), "I segnali indicativi non si possono usare da soli: aggiungi un segnale verificato")
    .refine((s) => !s.codes.includes("job_ad") || s.jobFamilies.length > 0, "Scegli la figura cercata negli annunci"),
}).refine(
  (i) => !i.signals.codes.includes("job_ad") || i.countries.every((c) => (JOB_AD_COUNTRIES as readonly string[]).includes(c)),
  "Gli annunci di lavoro non sono ancora disponibili per uno dei paesi scelti",
);

export const REPEAT_LABEL = { none: "Una volta", weekly: "Ogni settimana", monthly: "Ogni mese" } as const;
export type Repeat = keyof typeof REPEAT_LABEL;

// Prossima ripetizione dopo `from`, saltando quelle già passate.
export function nextRepeatAt(repeat: Exclude<Repeat, "none">, from: Date, now = new Date()) {
  const d = new Date(from);
  do {
    if (repeat === "weekly") d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  } while (d <= now);
  return d;
}

export type SearchInput = z.infer<typeof searchInputSchema>;

// Il target salvato nel database e inviato al motore.
export function toTarget(input: SearchInput) {
  return {
    industry: input.industry,
    industry_keywords: input.industryKeywords,
    countries: input.countries,
    country_names: input.countries.map((c) => COUNTRY_NAME[c]),
    regions: input.regions,
    company_size: input.companySizes,
    revenue_range: input.revenueRange,
    roles: input.roles,
    keywords: input.keywords,
    exclude_keywords: input.excludeKeywords,
    notes: input.notes,
    ...(input.signals.codes.length ? { signals: toSignalsTarget(input.signals) } : {}),
  };
}
export type SearchTarget = ReturnType<typeof toTarget>;

export function defaultSearchName(input: SearchInput) {
  const where = input.regions[0] ?? COUNTRY_NAME[input.countries[0]];
  return `${input.industry} · ${where}`.slice(0, 120);
}
