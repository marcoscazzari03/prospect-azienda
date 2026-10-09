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
const ENRICHMENT_SHARE: Record<EmailMode, number> = { personal_only: 1, mixed: 0.6, generic_ok: 0.2 };

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
  };
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
};

// Dopo un giro: nuovo giro (top-up) o chiusura della ricerca.
export function nextStep(result: ApplyResult, maxAttempts: number): "topup" | "finalize" | "none" {
  if (!result.ok) return "none";
  if ((result.remaining ?? 0) <= 0) return "finalize";
  if ((result.attempts ?? 0) >= maxAttempts) return "finalize";
  // Un top-up che non trova nulla di nuovo non ne merita un altro.
  if ((result.attempts ?? 0) > 1 && (result.new ?? 0) === 0) return "finalize";
  // Ricerche lunghe: ci si ferma quando un giro rende meno del 5% di quanto
  // chiesto (il mercato è esaurito: escono quasi solo doppioni).
  const requested = (result.remaining ?? 0) + (result.new ?? 0);
  if ((result.attempts ?? 0) >= 3 && (result.new ?? 0) < Math.ceil(requested * 0.05)) return "finalize";
  return "topup";
}
