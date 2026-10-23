import { z } from "zod";
import { splitZones } from "@/lib/domain/search-input";
import { DB_SECTORS } from "@/lib/domain/db-sectors";

// Ricerche consigliate (punti 84–85): risposta di Haiku, controlli e link al wizard. Logica pura, senza chiamate.

export const BUSINESS_LIMITS = { description: 300, area: 120, minLeads: 10, maxSuggestions: 3 } as const;

// Cosa chiediamo a Haiku: a chi vende l'attività e fino a 6 ricerche verso aziende, ognuna su un settore del database (ne
// mostriamo al massimo 3, quelle con più lead).
// Esempi del campo «Cosa fai?», uno a caso a ogni apertura: tutte attività che vendono ad aziende.
export const BUSINESS_EXAMPLES = [
  "Falegnameria: mobili su misura per negozi, uffici e hotel",
  "Web agency: siti nuovi e rifacimento di siti per piccole imprese",
  "Impresa di pulizie per uffici, condomini e capannoni",
  "Fotografo: foto professionali per hotel, ristoranti e aziende",
  "Consulente IT: assistenza informatica e reti per studi e aziende",
  "Studio commercialista per artigiani e piccole imprese",
] as const;
export const randomBusinessExample = () => BUSINESS_EXAMPLES[Math.floor(Math.random() * BUSINESS_EXAMPLES.length)];

// Il settore è un elenco chiuso (i settori del database): l'output strutturato obbliga Haiku a sceglierne uno scritto uguale
// (Code Reviewer, 23/10: «Studi di architettura» invece di «Studio di architettura» veniva scartata in silenzio).
export const haikuAnswerSchema = z.object({
  sells_to: z.enum(["businesses", "consumers", "both", "unclear"]),
  suggestions: z.array(z.object({
    title: z.string(),
    why: z.string(),
    industry: z.enum(DB_SECTORS.map(([name]) => name) as [string, ...string[]]),
    offer: z.string().nullable(),
  })),
});
export type HaikuAnswer = z.infer<typeof haikuAnswerSchema>;

export type Suggestion = { title: string; why: string; industry: string; keywords: string[]; offer: string | null; leads: number };
// Salvato sull'organizzazione (business_suggestions): l'esito e le proposte già contate.
export type StoredSuggestions = {
  sellsTo: HaikuAnswer["sells_to"];
  items: Suggestion[];
  // Tutte le proposte di Haiku con il conteggio e la risposta grezza del database, per le prove.
  tried?: (Pick<Suggestion, "title" | "industry" | "keywords" | "leads"> & { why?: string; offer?: string | null; db?: unknown; at?: string })[];
  countedAt?: string; // ultimo conteggio dei lead (alla proposta o nel ricalcolo notturno)
};

const clean = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);
const SECTORS = new Map(DB_SECTORS.map(([name, keywords]) => [name.toLowerCase(), { name, keywords: [...keywords] }]));

// Testi entro limiti sicuri, servizio solo se è tra quelli attivi. Il settore deve essere uno di quelli del database
// (DB_SECTORS), con le sue parole chiave: un settore inventato («PMI», «Artigiani») o parole chiave che le aziende non
// hanno davano 0 lead (23/10). Le proposte con un settore sconosciuto si scartano.
export function sanitizeAnswer(a: HaikuAnswer, offerCodes: readonly string[]): { sells_to: HaikuAnswer["sells_to"]; suggestions: Omit<Suggestion, "leads">[] } {
  return {
    sells_to: a.sells_to,
    suggestions: a.suggestions
      .map((s) => {
        const sector = SECTORS.get(clean(s.industry, 80).replace(/’/g, "'").toLowerCase());
        return {
          title: clean(s.title, 90),
          why: clean(s.why, 160),
          industry: sector?.name ?? "",
          keywords: sector?.keywords ?? [],
          offer: s.offer && offerCodes.includes(s.offer) ? s.offer : null,
        };
      })
      .filter((s) => s.title && s.industry)
      .filter((s, i, all) => all.findIndex((x) => x.industry === s.industry && x.offer === s.offer) === i)
      .slice(0, 6), // Haiku ne propone fino a 6: oltre si ignorano invece di rifiutare la risposta
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
// Oltre il tetto del conteggio (501 aziende lette, migrazione 065) il numero vero è più alto: «oltre 500».
export const LEADS_CAP = 500;
export function leadsLabel(n: number) {
  return n > LEADS_CAP ? `oltre ${LEADS_CAP} lead` : `circa ${new Intl.NumberFormat("it-IT").format(aboutLeads(n))} lead`;
}

export function aboutLeads(n: number) {
  if (n < 10) return n;
  if (n < 100) return Math.floor(n / 5) * 5;
  return Math.floor(n / 10) * 10;
}

// I dati della ricerca di una proposta, come li manda il wizard (stessi campi, anche quelli vuoti: senza, il controllo
// della ricerca li rifiutava e il conteggio dava 0 a tutto, 23/10).
export function suggestionSearchInput(s: Pick<Suggestion, "industry" | "keywords">, area: string, signals: unknown) {
  return {
    industry: s.industry,
    industryKeywords: s.keywords,
    countries: ["IT"],
    regions: splitZones(area, ["IT"]),
    roles: [],
    keywords: [],
    excludeKeywords: [],
    emailMode: "company_only",
    contact: "email_or_form",
    quantity: 10,
    signals: signals ?? { codes: [], match: "any", jobFamilies: [] },
  };
}
