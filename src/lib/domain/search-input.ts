import { z } from "zod";
import PROVINCE from "../../../n8n/annunci/province.json";
import { COMPANY_SIZES, COUNTRY_NAME, EMAIL_MODES } from "./catalog";
import { BLOCKED_SECTORS_MESSAGE, blockedSector } from "./blocked-sectors";
import { JOB_AD_COUNTRIES, JOB_FAMILIES, OFFERS, SIGNALS, SIGNAL_RULES, chargesSignal, offerByCode, toSignalsTarget } from "./signals";

const list = (max: number, itemMax = 80, message?: string) =>
  z
    .array(z.string().trim().min(1).max(itemMax))
    .max(max, message)
    .transform((a) => [...new Set(a)]);

// Zone scritte dal cliente: si separano con virgola, punto e virgola, a capo, «/», «&» e parentesi. Le parti unite da
// «e» diventano zone diverse («Modena e Reggio Emilia», «Campania e Sicilia»); «… e provincia», «provincia di …»,
// «… e dintorni», «tutta la …» si riducono al nome, perché le aziende sono già legate alla loro provincia (QA, 21/10:
// «Napoli e provincia» dava 0 aziende dal database). Restano intere le province e i comuni che hanno «e» nel nome;
// «Nord», «Centro», «Sud» e «Isole» diventano le loro regioni.
const chiave = (z: string) => z.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();
const CON_E = new Set(["pesaro e urbino", "monza e brianza", "monza e della brianza", "massa e cozzile",
  "trinita d agultu e vignola", "pozzaglio ed uniti", "sesto ed uniti"]);
const ATTORNO = "(?:la\\s+|le\\s+)?(?:sua\\s+|loro\\s+)?(?:provincia|province|prov\\.?|dintorni|hinterland|cintura|limitrofi|comuni limitrofi|zone limitrofe|province limitrofe|zone vicine|area metropolitana)";
const VUOTE = new RegExp(`^(?:${ATTORNO}|e|ed|italia|tutta italia|tutta l italia)$`, "i");
const pulisciZona = (z: string) => z.trim()
  .replace(/\s*\((?:provincia|prov\.?)\)\s*$/i, "")
  .replace(new RegExp(`\\s+(?:e|ed)\\s+${ATTORNO}\\s*$`, "i"), "")
  .replace(/\s+(?:e\s+)?(?:provincia|prov\.?)\s*$/i, "")
  .replace(/^(?:la\s+|le\s+)?(?:provincia|province|prov\.?)\s+(?:di\s+)?/i, "")
  .replace(/^(?:tutt[aoie]\s+(?:la\s+|il\s+|l'|le\s+|i\s+)?|(?:area|zona)\s+(?:di\s+)?)/i, "")
  .replace(/\s+citt[aà]$/i, "")
  .trim();
const NORD = ["Lombardia", "Piemonte", "Liguria", "Valle d'Aosta", "Veneto", "Trentino-Alto Adige", "Friuli-Venezia Giulia", "Emilia-Romagna"];
const CENTRO = ["Toscana", "Marche", "Umbria", "Lazio"];
const SUD = ["Abruzzo", "Molise", "Campania", "Puglia", "Basilicata", "Calabria"];
const ISOLE = ["Sicilia", "Sardegna"];
const MACRO: Record<string, string[]> = {
  "nord": NORD, "nord italia": NORD, "italia settentrionale": NORD,
  "nord ovest": ["Lombardia", "Piemonte", "Liguria", "Valle d'Aosta"],
  "nord est": ["Veneto", "Trentino-Alto Adige", "Friuli-Venezia Giulia", "Emilia-Romagna"],
  "centro": CENTRO, "centro italia": CENTRO, "italia centrale": CENTRO,
  "sud": SUD, "sud italia": SUD, "meridione": SUD, "mezzogiorno": [...SUD, ...ISOLE], "italia meridionale": SUD,
  "isole": ISOLE, "sud e isole": [...SUD, ...ISOLE],
};
// «Reggio» da solo vale sia per Reggio Emilia sia per Reggio Calabria: si sceglie dalle altre zone (QA, 21/10).
const EMILIA = /^(reggio emilia|reggio nell emilia|emilia romagna|emilia|modena|parma|piacenza|bologna|ferrara|ravenna|forli|cesena|forli cesena|rimini|carpi|sassuolo)$/;
const CALABRIA = /^(reggio calabria|reggio di calabria|calabria|catanzaro|cosenza|crotone|vibo valentia|messina|sicilia)$/;

// Sigle di provincia scritte in maiuscolo («MO, RE», «Bari (BA)»): le aziende hanno il nome della provincia, non la sigla.
const SIGLE = new Map((PROVINCE as [string, string, string][]).map(([sigla, nome]) => [sigla, nome]));
const daSigla = (z: string) => (/^[A-Z]{2}$/.test(z) && SIGLE.get(z)) || z;

// Sigle, macroaree e «Reggio» sono italiani: valgono solo se la ricerca comprende l'Italia («CA» negli Stati Uniti
// non è Cagliari; Code Reviewer, 21/10).
export function splitZones(raw: string, countries: string[] = ["IT"]) {
  const italia = countries.includes("IT");
  // Testo tagliato e spazi compattati prima delle espressioni: con migliaia di spazi di fila alcune diventano lentissime
  // (ripasso di sicurezza del 21/10). 20 zone da 80 caratteri stanno comunque sotto i 2.000.
  raw = raw.slice(0, 2000).replace(/[^\S\n]+/g, " ");
  // Il testo tra parentesi precisa la zona («Sardegna (Sud)»): lì «Sud» non è una macroarea (Code Reviewer, 21/10).
  const segmenti = raw.split(/[\n,;/&]/).flatMap((p) => p.split(/[()]/).map((x, i) => ({ x, tra: i % 2 === 1 })));
  const pezzi = segmenti.flatMap(({ x, tra }) => {
    const piece = pulisciZona(x);
    const parti = piece.split(/\s+(?:e|ed)\s+/i).map(pulisciZona);
    // Si riuniscono le parti che insieme formano un nome con «e» («Monza e Brianza» anche dentro «Milano e Monza e Brianza»).
    const unite: string[] = [];
    for (let i = 0; i < parti.length; i++) {
      const due = [`${parti[i]} e ${parti[i + 1]}`, `${parti[i]} ed ${parti[i + 1]}`].find((n) => CON_E.has(chiave(n)));
      if (i + 1 < parti.length && due) { unite.push(due); i++; } else unite.push(parti[i]);
    }
    return unite.map((z) => ({ z, tra }));
  });
  const zone = pezzi.filter(({ z }) => z && !VUOTE.test(chiave(z))).flatMap(({ z, tra }) => (italia && !tra && MACRO[chiave(z)]) || [italia ? daSigla(z) : z]);
  const chiavi = zone.map(chiave);
  const risolte = zone.map((z) => !italia || chiave(z) !== "reggio" ? z
    : chiavi.some((k) => EMILIA.test(k)) ? "Reggio Emilia" : chiavi.some((k) => CALABRIA.test(k)) ? "Reggio Calabria" : z);
  return risolte.filter((z, i) => risolte.findIndex((x) => chiave(x) === chiave(z)) === i);
}

// Parole chiave del settore scritte in modi diversi: la corrispondenza con le aziende è sulle parole, quindi
// «web agency» non trovava «Agenzia Web» né «WebAgency» (QA, 21/10). Ogni parola chiave porta con sé le sue
// varianti; le parole chiave sono alternative tra loro, quindi la ricerca non si allarga oltre il sinonimo.
// Le varianti si aggiungono solo al target inviato alla ricerca: «Ripeti la ricerca» e la pagina della ricerca
// mostrano le parole del cliente (withoutSynonyms).
const SINONIMI = [
  ["web agency", "agenzia web", "webagency"],
  ["software house", "softwarehouse"],
  ["e-commerce", "ecommerce"],
];
// Confronto come nel database (term_stems): senza spazi, trattini e vocale finale («agenzie web» = «agenzia web»).
const parole = (k: string) => chiave(k).split(" ").map((w) => (w.length >= 5 ? w.replace(/[aeio]$/, "") : w)).join(" ");
const radice = (k: string) => parole(k).replace(/ /g, "");
const gruppoDi = (k: string) => SINONIMI.findIndex((g) => g.some((v) => radice(v) === radice(k) || chiave(v).replace(/ /g, "") === chiave(k).replace(/ /g, "")));
export function withSynonyms(keywords: string[]) {
  // Doppioni per parole (non per lettere): «web agency» e «webagency» sono parole diverse per il database.
  const out = new Map(keywords.map((k) => [parole(k), k]));
  for (const k of keywords) {
    for (const v of SINONIMI[gruppoDi(k)] ?? []) if (!out.has(parole(v))) out.set(parole(v), v);
  }
  return [...out.values()];
}
// Il contrario: una sola parola per gruppo di sinonimi (la prima, cioè quella scritta dal cliente).
export function withoutSynonyms(keywords: string[]) {
  const visti = new Set<number>();
  return keywords.filter((k) => {
    const g = gruppoDi(k);
    if (g < 0) return true;
    if (visti.has(g)) return false;
    visti.add(g);
    return true;
  });
}

export const CONTACT_OPTIONS = ["email_or_form", "email_only"] as const;
export type ContactOption = (typeof CONTACT_OPTIONS)[number];
export const CONTACT_LABEL: Record<ContactOption, string> = {
  email_or_form: "Email aziendale o modulo di contatto",
  email_only: "Solo con email aziendale",
};

export const searchInputSchema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  // Facoltativo solo nella ricerca opportunità («tutti i settori»): vedi il controllo sotto.
  industry: z.string().trim().max(200).default(""),
  industryKeywords: list(10, 80, "Al massimo 10 parole chiave del settore"),
  countries: list(10, 2)
    .refine((a) => a.length > 0, "Scegli almeno un paese")
    .refine((a) => a.every((c) => c in COUNTRY_NAME), "Paese non valido"),
  // 20: «Nord, Sud e Isole» sono già 16 regioni.
  regions: list(20, 80, "Al massimo 20 zone (Nord, Centro e Sud contano come le loro regioni): unisci le città in una regione o fai due ricerche"),
  companySizes: z.array(z.enum(COMPANY_SIZES)).max(COMPANY_SIZES.length).default([]),
  revenueRange: z.string().trim().max(60).optional().default(""),
  // Ruoli: solo per le modalità con i referenti (vedi il controllo sotto).
  roles: list(10),
  keywords: list(15),
  excludeKeywords: list(15),
  notes: z.string().trim().max(600).optional().default(""),
  emailMode: z.enum(EMAIL_MODES),
  // «Solo azienda»: contatto richiesto. Con il modulo si consegnano anche le aziende senza
  // email pubblica ma con il modulo di contatto sul loro sito.
  contact: z.enum(CONTACT_OPTIONS).default("email_only"),
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
  (i) => i.emailMode === "company_only" || i.roles.length > 0,
  "Indica almeno un ruolo",
).refine(
  (i) => i.industry.length >= 3 || (Boolean(i.signals.offer) && !i.industry.length),
  "Descrivi il settore (almeno 3 caratteri)",
).refine(
  (i) => !blockedSector([i.industry, ...i.industryKeywords, ...i.keywords, i.notes, i.name]),
  BLOCKED_SECTORS_MESSAGE,
).refine(
  (i) => !i.signals.codes.includes("job_ad") || i.countries.every((c) => (JOB_AD_COUNTRIES as readonly string[]).includes(c)),
  "Per ora gli annunci di lavoro sono disponibili solo per l'Italia",
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
// Ricerca con segnali: dimensione, fatturato, parole chiave aggiuntive e note non si usano,
// perché le aziende del database non si possono filtrare così (il wizard non li chiede).
export function toTarget(input: SearchInput) {
  const signals = input.signals.codes.length > 0;
  // «Tutti i settori» con un servizio che ha i suoi settori adatti: si cercano solo quelli.
  const sectors = !input.industry && !input.industryKeywords.length && input.signals.offer ? offerByCode(input.signals.offer)?.sectors : undefined;
  return {
    industry: input.industry,
    industry_keywords: sectors ?? withSynonyms(input.industryKeywords),
    countries: input.countries,
    country_names: input.countries.map((c) => COUNTRY_NAME[c]),
    regions: input.regions,
    company_size: signals ? [] : input.companySizes,
    revenue_range: signals ? "" : input.revenueRange,
    roles: input.emailMode === "company_only" ? [] : input.roles,
    keywords: signals ? [] : input.keywords,
    exclude_keywords: input.excludeKeywords,
    notes: signals ? "" : input.notes,
    contact: input.emailMode === "company_only" ? input.contact : "email_only",
    ...(input.signals.codes.length ? { signals: toSignalsTarget(input.signals) } : {}),
  };
}
export type SearchTarget = ReturnType<typeof toTarget>;

export function defaultSearchName(input: SearchInput) {
  const where = input.regions[0] ?? COUNTRY_NAME[input.countries[0]];
  const what = input.industry || (input.signals.offer && offerByCode(input.signals.offer)?.label) || "Ricerca";
  return `${what} · ${where}`.slice(0, 120);
}
