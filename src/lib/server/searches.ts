import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { SEARCH_RULES } from "@/lib/config";
import {
  buildEnginePayload,
  enrichmentSearchBudget,
  maxAttemptsFor,
  nextStep,
  type ApplyResult,
  type EngineSearch,
} from "@/lib/domain/engine";
import { roleMatcher } from "@/lib/domain/roles";
import { nextRepeatAt } from "@/lib/domain/search-input";
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

// Verifiche a pagamento ancora disponibili per un giro: il minimo tra quanto
// resta alla ricerca e quanto resta del budget mensile impostato dall'admin.
async function loadEnrichmentBudget(search: SearchRow) {
  const { data, error } = await createAdminClient().rpc("enrichment_usage", { p_search: search.id }).single();
  if (error || !data) return undefined; // senza dati valgono i soli limiti del piano
  const usage = data as { search_used: number; month_used: number; month_budget: number | null };
  const forSearch = enrichmentSearchBudget(search.email_mode, search.quantity) - usage.search_used;
  const forMonth = usage.month_budget === null ? Infinity : usage.month_budget - usage.month_used;
  return Math.max(0, Math.min(forSearch, forMonth));
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

  const [exclusions, enrichmentBudget] = await Promise.all([
    loadExclusions(search.org_id, search.contacts_per_company),
    loadEnrichmentBudget(search),
  ]);
  const payload = buildEnginePayload({
    search,
    plan,
    runId,
    runToken: token,
    callbackUrl: `${env.appUrl()}/api/engine/callback`,
    exclusions,
    enrichmentBudget,
  });
  // Il tetto concesso a questo giro conta subito nel budget del mese.
  await db.from("search_runs").update({ enrichment_cap: payload.limits.enrichment_cap }).eq("id", runId);

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

// Magazzino: consegna subito i contatti già trovati per altri clienti con lo
// stesso target (paese, settore, zona) e un ruolo coerente. Il resto lo cerca il motore.
export async function fillFromWarehouse(searchId: string) {
  const db = createAdminClient();
  const { search } = await loadSearch(searchId);
  const { data: candidates, error } = await db.rpc("warehouse_candidates", {
    p_search: searchId,
    p_max_age_days: SEARCH_RULES.warehouseMaxAgeDays,
    p_limit: 500,
  });
  if (error) {
    console.error("warehouse_candidates", error.message);
    return 0;
  }
  const match = roleMatcher(search.target.roles ?? []);
  // Solo ruoli certi: il magazzino deve essere più preciso del motore.
  const picks = (candidates ?? [])
    .filter((c) => match(c.job_title) === "exact")
    .map((c) => ({ person_id: c.person_id, role_match: "exact" }));
  if (!picks.length) return 0;
  const { data, error: deliverError } = await db.rpc("deliver_from_warehouse", {
    p_search: searchId,
    p_picks: picks,
    p_max_age_days: SEARCH_RULES.warehouseMaxAgeDays,
  });
  if (deliverError) {
    console.error("deliver_from_warehouse", deliverError.message);
    return 0;
  }
  return Number((data as { new?: number } | null)?.new ?? 0);
}

// Avvio di una ricerca nuova: prima il magazzino, poi il motore per i lead mancanti.
export async function startSearch(searchId: string) {
  await fillFromWarehouse(searchId);
  return dispatchRun(searchId);
}

// Dopo i risultati di un giro: top-up o chiusura.
export async function afterResults(result: ApplyResult) {
  if (!result.search_id) return;
  const { data: search } = await createAdminClient()
    .from("searches")
    .select("quantity, email_mode")
    .eq("id", result.search_id)
    .maybeSingle();
  const maxAttempts = search
    ? maxAttemptsFor(search.quantity, search.email_mode as EngineSearch["email_mode"], SEARCH_RULES.maxAttempts)
    : SEARCH_RULES.maxAttempts;
  const step = nextStep(result, maxAttempts);
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

// Ricerche ricorrenti: avvia le ripetizioni scadute (chiamato dal cron giornaliero).
// Ogni ripetizione è una ricerca nuova con gli stessi filtri: i contatti già
// consegnati sono esclusi da soli. Senza crediti la ripetizione salta e il
// cliente riceve un'email.
export async function runDueRepeats() {
  const db = createAdminClient();
  const now = new Date();
  const { data: due } = await db
    .from("searches")
    .select("id, org_id, created_by, name, target, email_mode, quantity, contacts_per_company, repeat, next_repeat_at")
    .neq("repeat", "none")
    .lte("next_repeat_at", now.toISOString())
    .limit(50);
  let started = 0;
  for (const parent of due ?? []) {
    const repeat = parent.repeat as "weekly" | "monthly";
    // Prima si sposta la scadenza: un cron ripetuto non avvia due volte.
    const { data: claimed } = await db
      .from("searches")
      .update({ next_repeat_at: nextRepeatAt(repeat, new Date(parent.next_repeat_at!), now).toISOString() })
      .eq("id", parent.id)
      .eq("next_repeat_at", parent.next_repeat_at!)
      .select("id");
    if (!claimed?.length || !parent.created_by) continue;

    const day = now.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
    const baseName = parent.name.replace(/ · \d{1,2}\/\d{1,2}\/\d{4}$/, "");
    const { data: child, error } = await db
      .rpc("create_search", {
        p_user: parent.created_by,
        p_org: parent.org_id,
        p_name: `${baseName} · ${day}`.slice(0, 120),
        p_target: parent.target,
        p_mode: parent.email_mode,
        p_quantity: parent.quantity,
        p_contacts_per_company: parent.contacts_per_company,
      })
      .single();
    if (error || !child) {
      const reason = /INSUFFICIENT_CREDITS/.test(error?.message ?? "")
        ? "crediti insufficienti"
        : /ACTIVE_LIMIT/.test(error?.message ?? "")
          ? "troppe ricerche in corso"
          : /ORG_SUSPENDED/.test(error?.message ?? "")
            ? "account sospeso"
            : "errore interno";
      await db.from("search_events").insert({
        search_id: parent.id,
        stage: "repeat_skipped",
        message: `Ripetizione del ${day} non avviata: ${reason}`,
      });
      const { data: profile } = await db.from("profiles").select("email").eq("user_id", parent.created_by).maybeSingle();
      await sendEmail(
        profile?.email ?? "",
        `Ripetizione non avviata: ${parent.name}`,
        `La ripetizione automatica della ricerca "${parent.name}" non è partita (${reason}).\n\n${env.appUrl()}/app/crediti`,
      );
      continue;
    }
    const childId = (child as { id: string }).id;
    await db.from("searches").update({ repeat_of: parent.id }).eq("id", childId);
    await db.from("search_events").insert({
      search_id: parent.id,
      stage: "repeat_started",
      message: `Ripetizione del ${day} avviata`,
    });
    await startSearch(childId);
    started++;
  }
  return started;
}
