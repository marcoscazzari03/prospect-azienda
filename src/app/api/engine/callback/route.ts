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
  const payload = body as { leads?: unknown[]; stats?: Record<string, unknown> };
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
  after(() => afterResults(result));
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
