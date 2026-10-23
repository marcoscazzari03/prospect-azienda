import { z } from "zod";

// Ricerche consigliate (punti 84–85): risposta di Haiku, controlli e link al wizard. Logica pura, senza chiamate.

export const BUSINESS_LIMITS = { description: 500, area: 120, minLeads: 10, maxSuggestions: 3 } as const;

// Cosa chiediamo a Haiku: a chi vende l'attività e fino a 4 ricerche verso aziende (ne mostriamo al massimo 3, quelle
// con più lead nel database).
export const haikuAnswerSchema = z.object({
  sells_to: z.enum(["businesses", "consumers", "both", "unclear"]),
  suggestions: z.array(z.object({
    title: z.string(),
    why: z.string(),
    industry: z.string(),
    keywords: z.array(z.string()),
    offer: z.string().nullable(),
  })).max(4),
});
export type HaikuAnswer = z.infer<typeof haikuAnswerSchema>;

export type Suggestion = { title: string; why: string; industry: string; keywords: string[]; offer: string | null; leads: number };
// Salvato sull'organizzazione (business_suggestions): l'esito e le proposte già contate.
export type StoredSuggestions = { sellsTo: HaikuAnswer["sells_to"]; items: Suggestion[] };

const clean = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

// Testi entro limiti sicuri, parole chiave brevi e senza doppioni, servizio solo se è tra quelli attivi.
export function sanitizeAnswer(a: HaikuAnswer, offerCodes: readonly string[]): HaikuAnswer {
  return {
    sells_to: a.sells_to,
    suggestions: a.suggestions
      .map((s) => ({
        title: clean(s.title, 90),
        why: clean(s.why, 160),
        industry: clean(s.industry, 80),
        keywords: [...new Set(s.keywords.map((k) => clean(k, 40).toLowerCase()).filter((k) => k.length >= 3))].slice(0, 6),
        offer: s.offer && offerCodes.includes(s.offer) ? s.offer : null,
      }))
      .filter((s) => s.title && s.industry),
  };
}

// Le proposte da mostrare: con almeno minLeads lead, le più ricche prima, al massimo 3.
export function pickSuggestions(items: Suggestion[]) {
  return items.filter((s) => s.leads >= BUSINESS_LIMITS.minLeads).sort((a, b) => b.leads - a.leads).slice(0, BUSINESS_LIMITS.maxSuggestions);
}

// Il wizard già compilato: settore, parole chiave, zona e, se c'è, il servizio (ricerca opportunità).
export function wizardHref(s: Pick<Suggestion, "title" | "industry" | "keywords" | "offer">, area: string) {
  const q = new URLSearchParams({ settore: s.industry, nome: s.title });
  if (s.keywords.length) q.set("parole", s.keywords.join(","));
  if (area.trim()) q.set("zona", area.trim());
  if (s.offer) {
    q.set("servizio", s.offer);
    q.set("tipo", "opportunita");
  }
  return `/app/ricerche/nuova?${q.toString()}`;
}

// «Circa X»: arrotondato come il wizard (sotto 10 il numero esatto, poi a 5 o a 10).
export function aboutLeads(n: number) {
  if (n < 10) return n;
  if (n < 100) return Math.floor(n / 5) * 5;
  return Math.floor(n / 10) * 10;
}
