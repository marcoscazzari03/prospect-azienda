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
export function enrichmentCap(mode: EmailMode, remaining: number, plan: EnginePlan) {
  const share = mode === "personal_only" ? 1 : mode === "mixed" ? 0.6 : 0.2;
  return Math.max(0, Math.min(plan.enrichment_per_run_max, Math.ceil(remaining * share)));
}

export function maxLots(remaining: number, mode: EmailMode) {
  const perLot = mode === "personal_only" ? 4 : 7; // lead utili attesi per lotto
  return Math.max(1, Math.min(12, Math.ceil(remaining / perLot)));
}

export function buildEnginePayload(args: {
  search: EngineSearch;
  plan: EnginePlan;
  runId: string;
  runToken: string;
  callbackUrl: string;
  exclusions: { domains: string[]; personKeys: string[] };
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
      enrichment_cap: enrichmentCap(search.email_mode, remaining, plan),
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
  return "topup";
}
