import { NextResponse, after } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual, sha256Hex } from "@/lib/server/crypto";
import { afterResults } from "@/lib/server/searches";
import { checkMailboxes } from "@/lib/server/email-check";
import { applyMailboxChecks } from "@/lib/domain/mailbox";
import type { ApplyResult } from "@/lib/domain/engine";
import type { Json } from "@/lib/supabase/database.types";

// Eventi dal motore n8n (vedi docs/03-contratto-motore.md).
// Doppia verifica: segreto condiviso nell'header + token monouso del giro.

export const maxDuration = 120;

const eventSchema = z.object({
  event: z.enum(["progress", "results"]),
  run_id: z.string().uuid(),
  run_token: z.string().min(24).max(128),
  stage: z.string().max(40).optional(),
  message: z.string().max(300).optional(),
  counters: z.record(z.string(), z.unknown()).optional(),
  leads: z.array(z.unknown()).max(2000).optional(),
});

export async function POST(request: Request) {
  const secret = env.engineCallbackSecret();
  const given = request.headers.get("x-engine-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 8_000_000) return NextResponse.json({ error: "payload troppo grande" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "json non valido" }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "evento non valido" }, { status: 400 });

  const evt = parsed.data;
  const tokenHash = sha256Hex(evt.run_token);
  const db = createAdminClient();

  if (evt.event === "progress") {
    const { data } = await db.rpc("record_engine_progress", {
      p_run: evt.run_id,
      p_token_hash: tokenHash,
      p_stage: evt.stage ?? "progress",
      p_message: evt.message ?? "",
      p_counters: (evt.counters ?? {}) as Json,
    });
    return NextResponse.json({ ok: Boolean(data) });
  }

  // Prima della consegna: le email trovate sui siti devono avere una casella
  // raggiungibile (le verificate dall'arricchimento sono già controllate).
  const payload = body as { leads?: unknown[]; rejected?: unknown[]; stats?: Record<string, unknown> };
  // Lead validi non consegnabili a questo cliente (es. generica in «solo nominative»):
  // passano gli stessi controlli e finiscono solo nel magazzino.
  const stockOnly = (payload.rejected ?? [])
    .map((r) => r as { reason?: string; email?: { address?: string } })
    .filter((r) => r?.reason === "solo_email_generica" && r.email?.address)
    .map((r) => ({ ...r, _stock_only: true }));
  if (stockOnly.length) payload.leads = [...(payload.leads ?? []), ...stockOnly].slice(0, 2000);
  // Aziende già controllate e scartate in questo giro: i giri successivi della stessa
  // ricerca non le ripropongono (salvate in search_runs.stats).
  // Aziende con il segnale verificato ma senza referente cercato (oltre il tetto del giro):
  // il giro successivo le usa per prime, senza una nuova ricerca AI.
  payload.stats = { ...payload.stats, checked_domains: checkedDomains(payload.rejected), reserve: reserveOf(payload.rejected) };
  let apiCalls = 0;
  const { data: run } = await db.rpc("check_run", { p_run: evt.run_id, p_token_hash: tokenHash }).maybeSingle();
  const open = run && ["dispatched", "running"].includes((run as { status: string }).status);
  if (open && payload.leads?.length) {
    const fromSites = payload.leads
      .map((l) => l as { email?: { address?: string; status?: string } })
      .filter((l) => l?.email?.status === "found_public" && l.email.address)
      .map((l) => String(l.email!.address));
    // Entro ~20-25 s: n8n attende la risposta per 30 s (le caselle non controllate in tempo restano valide).
    const checked = await checkMailboxes(fromSites, 18_000);
    apiCalls = checked.apiCalls;
    const { leads, rejected } = applyMailboxChecks(payload.leads, checked.results);
    payload.leads = leads;
    payload.stats = { ...payload.stats, mailbox_rejected: rejected, mailbox_checked: checked.results.size };
  }

  // Database delle aziende: esito dei controlli tecnici di tutte le aziende viste nel giro,
  // anche di quelle scartate. Un errore qui non deve bloccare la consegna dei lead.
  const companyChecks = (body as { company_checks?: unknown }).company_checks;
  if (Array.isArray(companyChecks) && companyChecks.length) {
    const { error: checksError } = await db.rpc("record_company_checks", {
      p_run: evt.run_id,
      p_token_hash: tokenHash,
      p_items: companyChecks.slice(0, 500) as Json,
    });
    if (checksError) console.error("record_company_checks", checksError);
    delete (payload as { company_checks?: unknown }).company_checks;
  }

  const { data, error } = await db.rpc("apply_engine_results", {
    p_run: evt.run_id,
    p_token_hash: tokenHash,
    p_payload: payload as Json,
  });
  if (error) {
    // Errore nostro: n8n ritenterà l'invio (l'operazione è idempotente).
    console.error("apply_engine_results", error);
    return NextResponse.json({ error: "errore interno" }, { status: 500 });
  }
  const result = data as ApplyResult;
  if (!result.ok && result.reason === "invalid_token") {
    return NextResponse.json({ error: "token non valido" }, { status: 401 });
  }
  if (result.ok && apiCalls > 0) await recordVerifierCost(evt.run_id, apiCalls);
  // Top-up o chiusura dopo aver risposto a n8n.
  // Aziende rimaste senza referente cercato (oltre il tetto del giro): con la riserva dal
  // database (ricerche in target) non sono in stats.reserve, il giro dopo le riprende da lì.
  const reserveLeft = (payload.rejected ?? []).filter((r) => (r as { reason?: string })?.reason === "riserva").length;
  after(() => afterResults({ ...result, reserve_left: reserveLeft }));
  return NextResponse.json({ ok: result.ok, delivered: result.delivered, remaining: result.remaining });
}

async function recordVerifierCost(runId: string, units: number) {
  const db = createAdminClient();
  const { data: rate } = await db.from("cost_rates").select("unit_cost_eur").eq("provider", "email_verifier").maybeSingle();
  if (!rate) return;
  const unitCost = Number(rate.unit_cost_eur);
  await db.from("run_costs").insert({
    run_id: runId,
    provider: "email_verifier",
    units,
    unit_cost_eur: unitCost,
    total_eur: Math.round(units * unitCost * 10_000) / 10_000,
  });
}

// Domini delle aziende scartate (tranne quelle da riprovare per limiti temporanei).
function checkedDomains(rejected: unknown[] | undefined) {
  const out = new Set<string>();
  for (const r of rejected ?? []) {
    const x = r as { reason?: string; company?: { domain?: string } };
    const d = String(x?.company?.domain ?? "").trim().toLowerCase();
    if (d && x.reason !== "arricchimento_da_riprovare" && x.reason !== "riserva") out.add(d);
  }
  return [...out].slice(0, 500);
}

function reserveOf(rejected: unknown[] | undefined) {
  type R = {
    reason?: string;
    company?: { name?: string; website?: string; country?: string; city?: string; industry?: string; size_hint?: string; technologies?: unknown };
    sources?: { discovery_url?: string; contact_page?: string };
    signals?: unknown;
  };
  return (rejected ?? [])
    .map((r) => r as R)
    .filter((r) => r?.reason === "riserva" && r.company?.website && Array.isArray(r.signals) && r.signals.length)
    .slice(0, 40)
    .map((r) => ({
      company_name: r.company?.name ?? "",
      website: r.company?.website ?? "",
      country: r.company?.country ?? "",
      city: r.company?.city ?? "",
      industry: r.company?.industry ?? "",
      size_hint: r.company?.size_hint ?? "",
      technologies: Array.isArray(r.company?.technologies) ? r.company.technologies : [],
      source_url: r.sources?.discovery_url ?? "",
      contact_page: r.sources?.contact_page ?? "",
      signals: r.signals,
    }));
}
