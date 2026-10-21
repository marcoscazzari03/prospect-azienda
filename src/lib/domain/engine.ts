import type { EmailMode } from "./catalog";
import type { SearchTarget } from "./search-input";

// Costruzione del payload per il motore n8n (contratto v1, vedi docs/03).

export type EngineSearch = {
  id: string;
  target: SearchTarget;
  email_mode: EmailMode;
  quantity: number;
  delivered: number;
  contacts_per_company: number;
};

export type EnginePlan = { enrichment_per_run_max: number };

// Tetto di arricchimento a pagamento: dipende da quante nominative servono
// davvero e dal piano. È la leva che protegge il margine.
// «Solo azienda»: nessuna verifica a pagamento (niente persone da cercare).
const ENRICHMENT_SHARE: Record<EmailMode, number> = { personal_only: 1, mixed: 0.6, generic_ok: 0.2, company_only: 0 };

// `budget`: verifiche ancora disponibili (per la ricerca e nel mese), se noto.
export function enrichmentCap(mode: EmailMode, remaining: number, plan: EnginePlan, budget = Infinity) {
  const cap = Math.min(plan.enrichment_per_run_max, Math.ceil(remaining * ENRICHMENT_SHARE[mode]), budget);
  return Math.max(0, Math.floor(cap));
}

// Verifiche totali concesse a una ricerca, su tutti i giri: proporzionali ai
// lead richiesti (circa metà delle verifiche non trova un'email valida).
export function enrichmentSearchBudget(mode: EmailMode, quantity: number) {
  return Math.ceil(quantity * ENRICHMENT_SHARE[mode] * 1.5);
}

const MAX_LOTS_PER_RUN = 12;
const leadsPerLot = (mode: EmailMode) => (mode === "personal_only" ? 4 : 7); // lead utili attesi per lotto

export function maxLots(remaining: number, mode: EmailMode) {
  return Math.max(1, Math.min(MAX_LOTS_PER_RUN, Math.ceil(remaining / leadsPerLot(mode))));
}

// Giri del motore concessi a una ricerca: le ricerche grandi procedono a tappe
// (un giro rende al massimo ~80 lead, ~50 con solo nominative).
export function maxAttemptsFor(quantity: number, mode: EmailMode, base = 3, max = 15) {
  const perRun = MAX_LOTS_PER_RUN * leadsPerLot(mode);
  return Math.max(base, Math.min(max, Math.ceil(quantity / perRun) + 1));
}

export function buildEnginePayload(args: {
  search: EngineSearch;
  plan: EnginePlan;
  runId: string;
  runToken: string;
  callbackUrl: string;
  exclusions: { domains: string[]; personKeys: string[] };
  enrichmentBudget?: number;
  // Aziende con segnale già verificato nei giri precedenti (ricerche opportunità).
  reserve?: Record<string, unknown>[];
}) {
  const { search, plan } = args;
  const remaining = Math.max(0, search.quantity - search.delivered);
  return {
    contract_version: 1,
    job_id: search.id,
    run_id: args.runId,
    run_token: args.runToken,
    callback_url: args.callbackUrl,
    email_mode: search.email_mode,
    quantity: remaining,
    contacts_per_company: search.contacts_per_company,
    language: "it",
    target: search.target,
    exclusions: {
      domains: args.exclusions.domains.slice(0, 20000),
      person_keys: args.exclusions.personKeys.slice(0, 20000),
    },
    limits: {
      max_lots: maxLots(remaining, search.email_mode),
      candidates_per_lot: 20,
      enrichment_cap: enrichmentCap(search.email_mode, remaining, plan, args.enrichmentBudget),
    },
    ...(args.reserve?.length ? { reserve: args.reserve.slice(0, 40) } : {}),
  };
}

// Ricerche in cui l'annuncio di lavoro decide (da solo, o con «servono tutti»): solo
// aziende del database con annuncio raccolto dalle API. Collaudi del 14/10: la ricerca
// AI di aziende con annunci ha fatto 3 tentativi (~0,9 $) senza un solo lead.
export function jobAdFromDatabaseOnly(target: SearchTarget) {
  const codes = target.signals?.codes ?? [];
  return codes.includes("job_ad") && (codes.length === 1 || target.signals?.match === "all");
}

// Ricerca in target «semplice» (stessa regola di target_is_simple in SQL): settore e zona,
// senza vincoli che il database delle aziende non sa verificare (dimensione, fatturato,
// parole chiave, note). Solo queste usano le aziende del database come riserva.
export function targetIsSimple(target: SearchTarget) {
  return !(target.signals?.codes?.length)
    && Boolean(target.industry?.trim() || target.industry_keywords?.length)
    && !target.company_size?.length
    && !target.revenue_range?.trim()
    && !target.keywords?.length
    && !target.notes?.trim();
}

// Crediti in più a lead per le ricerche che usano la ricerca AI sul web (stessa regola di
// search_ai_extra in SQL): in target con filtri che il database non verifica o fuori dall'Italia.
export function aiSearchExtra(target: SearchTarget) {
  if (target.signals?.codes?.length) return 0;
  const abroad = (target.countries ?? []).some((c) => String(c).toUpperCase() !== "IT");
  return !targetIsSimple(target) || abroad ? 1 : 0;
}

export type ApplyResult = {
  ok: boolean;
  reason?: string;
  search_id?: string;
  new?: number;
  delivered?: number;
  quantity?: number;
  remaining?: number;
  attempts?: number;
  reserve_left?: number; // aziende rimaste in riserva senza referente cercato (dal giro appena chiuso)
  spent_eur?: number; // spesa del motore per la ricerca fino a questo giro
  budget_eur?: number; // budget del motore per la ricerca
};

// Dopo un giro: nuovo giro (top-up) o chiusura della ricerca.
export function nextStep(result: ApplyResult, maxAttempts: number): "topup" | "finalize" | "none" {
  if (!result.ok) return "none";
  if ((result.remaining ?? 0) <= 0) return "finalize";
  if ((result.attempts ?? 0) >= maxAttempts) return "finalize";
  if (result.budget_eur !== undefined && (result.spent_eur ?? 0) >= result.budget_eur) return "finalize";
  // Un top-up che non trova nulla di nuovo non ne merita un altro, a meno che restino
  // aziende in riserva ancora da provare (il giro successivo costa solo i referenti).
  if ((result.attempts ?? 0) > 1 && (result.new ?? 0) === 0 && !(result.reserve_left ?? 0)) return "finalize";
  // Ricerche lunghe: ci si ferma quando un giro rende meno del 5% di quanto
  // chiesto (il mercato è esaurito: escono quasi solo doppioni).
  const requested = (result.remaining ?? 0) + (result.new ?? 0);
  if ((result.attempts ?? 0) >= 3 && (result.new ?? 0) < Math.ceil(requested * 0.05)) return "finalize";
  return "topup";
}

// Aziende rimaste in riserva a fine giro (soprattutto quelle trovate dall'AI e non usate):
// vanno nel database delle aziende, così il controllo siti le verifica e le ricerche dopo le
// usano senza pagare di nuovo la ricerca AI (prova del 17/10: 26 hotel trovati, 6 usati).
// Settore e regione della ricerca diventano etichette, per ritrovarle con la stessa ricerca.
export function reserveCompaniesForDatabase(
  rejected: unknown[] | undefined,
  target: { industry?: string; industry_keywords?: string[]; regions?: string[]; countries?: string[] },
) {
  const countries = (target.countries ?? []).map((c) => String(c).toUpperCase());
  if (countries.length !== 1 || countries[0] !== "IT") return []; // l'importazione oggi è solo per l'Italia
  const regions = target.regions ?? [];
  const keywords = [target.industry ?? "", ...(target.industry_keywords ?? [])].map((k) => String(k).trim()).filter(Boolean).slice(0, 10);
  const seen = new Set<string>();
  const out: { domain: string; name: string; website: string; city: string; region: string; industry: string; keywords: string[] }[] = [];
  for (const raw of rejected ?? []) {
    const r = raw as { reason?: string; company?: { domain?: string; name?: string; website?: string; city?: string; industry?: string } };
    const domain = String(r?.company?.domain ?? "").trim().toLowerCase();
    if (r?.reason !== "riserva" || !domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push({
      domain,
      name: String(r.company?.name ?? "").trim(),
      website: String(r.company?.website ?? "").trim(),
      city: String(r.company?.city ?? "").trim(),
      region: regions.length === 1 ? String(regions[0]) : "",
      industry: String(r.company?.industry ?? "").trim() || String(target.industry ?? "").trim(),
      keywords,
    });
  }
  return out.slice(0, 200);
}

// «Email aziendale o modulo di contatto»: le aziende scartate dal motore solo perché senza
// email, ma con il modulo di contatto sul loro sito, diventano lead. Il database le consegna
// solo se la ricerca ha l'opzione (target.contact) e se il modulo è sul dominio dell'azienda.
// Punteggio più basso delle aziende con email, che restano davanti nell'ordine di consegna.
// URL sul sito dell'azienda (dominio o suo sottodominio), solo http(s), senza credenziali né porte
// insolite. Usato per i moduli di contatto e per i siti importati (ripasso di sicurezza del 19/10).
// Dominio pubblico: TLD alfabetico (niente IP), niente nomi interni né servizi DNS «jolly» che puntano a qualsiasi IP
// (127.0.0.1.nip.io). Stessa regola nei nodi n8n (04-deduplica-candidati, 06-esito-ricerca-web, «Homepage da leggere»);
// ripasso di sicurezza del 22/10.
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
const NOT_PUBLIC = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|invalid|test|example|nip\.io|sslip\.io|xip\.io|localtest\.me|lvh\.me|vcap\.me|traefik\.me|lacolhost\.com|localhost\.run)$/;
export function publicDomain(domain: unknown) {
  const d = String(domain ?? "").trim().toLowerCase();
  return d.length <= 200 && DOMAIN_RE.test(d) && !d.split(".").some((p) => p.startsWith("-") || p.endsWith("-")) && !NOT_PUBLIC.test(d);
}

export function urlOnDomain(raw: unknown, domain: unknown) {
  const d = String(domain ?? "").trim().toLowerCase();
  const s = String(raw ?? "").trim();
  if (!publicDomain(d) || !/^https?:\/\//i.test(s) || /[\\\s]/.test(s)) return false;
  try {
    const u = new URL(s);
    if (u.username || u.password || (u.port && u.port !== "80" && u.port !== "443")) return false;
    const h = u.hostname.toLowerCase();
    return h === d || h.endsWith(`.${d}`);
  } catch {
    return false;
  }
}

// Toglie dai lead i moduli di contatto che non stanno sul sito dell'azienda.
export function dropForeignContactForms(leads: unknown[] | undefined) {
  type L = { company?: { domain?: string; contact_form?: string } };
  return (leads ?? []).map((l) => {
    const lead = l as L;
    const form = lead?.company?.contact_form;
    if (!form || urlOnDomain(form, lead.company?.domain)) return l;
    const { contact_form: _drop, ...company } = lead.company ?? {};
    void _drop;
    return { ...(l as object), company };
  });
}

// Aziende senza email e senza modulo di contatto sul loro sito: le ricerche successive (anche di
// altri clienti) le mettono in fondo alla riserva (migrazione 047). Non con «Solo nominative»:
// lì «nessuna_email» vuol dire solo nessuna email di persona.
export function emailMissedDomains(rejected: unknown[] | undefined, mode: string | undefined) {
  if (mode === "personal_only") return [];
  type R = { reason?: string; company?: { domain?: string; contact_form?: string } };
  return [...new Set((rejected ?? [])
    .map((r) => r as R)
    .filter((r) => r?.reason === "nessuna_email" && !urlOnDomain(r.company?.contact_form, r.company?.domain))
    .map((r) => String(r.company?.domain ?? "").trim().toLowerCase())
    .filter(Boolean))].slice(0, 200);
}

export function formOnlyLeads(rejected: unknown[] | undefined) {
  type R = { reason?: string; company?: { domain?: string; contact_form?: string }; sources?: { discovery_url?: string } };
  return (rejected ?? [])
    .map((r) => r as R)
    .filter((r) => r?.reason === "nessuna_email" && urlOnDomain(r.company?.contact_form, r.company?.domain))
    .map((r) => ({
      ...r,
      quality: { score: 45, checks: { official_site: true, discovery_source: Boolean(r.sources?.discovery_url), contact_form: true } },
      _form_only: true,
    }));
}
