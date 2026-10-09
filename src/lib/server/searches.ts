import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { SEARCH_RULES } from "@/lib/config";
import { buildEnginePayload, nextStep, type ApplyResult, type EngineSearch } from "@/lib/domain/engine";
import { randomToken, sha256Hex } from "./crypto";
import { sendEmail } from "./email";

// Orchestrazione delle ricerche lato server (service role).

type SearchRow = EngineSearch & { org_id: string; name: string; status: string; created_by: string | null };

async function loadSearch(searchId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("searches")
    .select("id, org_id, name, status, target, email_mode, quantity, delivered, contacts_per_company, created_by, organizations(plan_id)")
    .eq("id", searchId)
    .single();
  if (error || !data) throw new Error(`Ricerca non trovata: ${searchId}`);
  const planId = (data.organizations as unknown as { plan_id: string }).plan_id;
  const { data: plan } = await db.from("plans").select("enrichment_per_run_max").eq("id", planId).single();
  return { search: data as unknown as SearchRow, plan: plan ?? { enrichment_per_run_max: 0 } };
}

// Esclusioni: contatti (e, con 1 contatto per azienda, aziende) già consegnati al cliente.
async function loadExclusions(orgId: string, contactsPerCompany: number) {
  const db = createAdminClient();
  const personKeys: string[] = [];
  const domains = new Set<string>();
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db
      .from("deliveries")
      .select("person_key, company_domain")
      .eq("org_id", orgId)
      .order("delivered_at", { ascending: false })
      .range(from, from + 999);
    if (!data?.length) break;
    for (const d of data) {
      personKeys.push(d.person_key);
      if (contactsPerCompany === 1) domains.add(d.company_domain);
    }
    if (data.length < 1000) break;
  }
  return { personKeys, domains: [...domains] };
}

export async function finalizeSearch(searchId: string, error?: string) {
  const db = createAdminClient();
  const { data: before } = await db.from("searches").select("status").eq("id", searchId).maybeSingle();
  if (!before || !["queued", "running"].includes(before.status)) return null;
  const { data } = await db.rpc("finalize_search", { p_search: searchId, p_error: error });
  const search = data as { status: string; delivered: number; quantity: number; name: string; created_by: string | null } | null;
  if (search?.created_by && ["completed", "partial", "failed"].includes(search.status)) {
    const { data: profile } = await db.from("profiles").select("email").eq("user_id", search.created_by).maybeSingle();
    const link = `${env.appUrl()}/app/ricerche/${searchId}`;
    const subject =
      search.status === "failed" ? `Ricerca non riuscita: ${search.name}` : `Ricerca pronta: ${search.delivered} lead`;
    const text =
      search.status === "failed"
        ? `La ricerca "${search.name}" non è andata a buon fine. I crediti riservati sono stati restituiti.\n\n${link}`
        : `La ricerca "${search.name}" è conclusa: ${search.delivered} lead su ${search.quantity}. I crediti non usati sono tornati disponibili.\n\n${link}`;
    await sendEmail(profile?.email ?? "", subject, text);
  }
  return search;
}

// Avvia un giro del motore (il primo o un top-up). Se l'invio fallisce,
// la ricerca viene chiusa e i crediti tornano al cliente.
export async function dispatchRun(searchId: string) {
  const db = createAdminClient();
  const { search, plan } = await loadSearch(searchId);
  const remaining = search.quantity - search.delivered;
  if (remaining <= 0) return finalizeSearch(searchId);

  const webhook = env.engineWebhookUrl();
  if (!webhook) return finalizeSearch(searchId, "Motore di ricerca non configurato");

  const token = randomToken();
  const { data: run, error } = await db
    .rpc("start_run", { p_search: searchId, p_token_hash: sha256Hex(token), p_requested: remaining })
    .single();
  if (error || !run) return finalizeSearch(searchId, "Impossibile avviare il giro di ricerca");
  const runId = (run as { id: string }).id;

  const exclusions = await loadExclusions(search.org_id, search.contacts_per_company);
  const payload = buildEnginePayload({
    search,
    plan,
    runId,
    runToken: token,
    callbackUrl: `${env.appUrl()}/api/engine/callback`,
    exclusions,
  });

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", [env.engineHeaderName()]: env.engineHeaderValue() },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    await db.from("search_runs").update({ status: "dispatch_failed", error: String(e) }).eq("id", runId);
    return finalizeSearch(searchId, "Il motore di ricerca non ha risposto");
  }
  return null;
}

// Dopo i risultati di un giro: top-up o chiusura.
export async function afterResults(result: ApplyResult) {
  if (!result.search_id) return;
  const step = nextStep(result, SEARCH_RULES.maxAttempts);
  if (step === "topup") await dispatchRun(result.search_id);
  else if (step === "finalize") await finalizeSearch(result.search_id);
}

// Giri rimasti senza notizie: chiusi con restituzione crediti.
export async function closeStaleRuns(orgId?: string) {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - SEARCH_RULES.staleRunMinutes * 60_000).toISOString();
  let query = db
    .from("search_runs")
    .select("id, search_id, searches!inner(org_id)")
    .in("status", ["dispatched", "running"])
    .lt("last_event_at", cutoff)
    .limit(100);
  if (orgId) query = query.eq("searches.org_id", orgId);
  const { data } = await query;
  const ids = [...new Set((data ?? []).map((r) => r.search_id as string))];
  for (const id of ids) await finalizeSearch(id, "Tempo massimo superato");
  return ids.length;
}
