import { NextResponse, after } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual, sha256Hex } from "@/lib/server/crypto";
import { afterResults } from "@/lib/server/searches";
import type { ApplyResult } from "@/lib/domain/engine";
import type { Json } from "@/lib/supabase/database.types";

// Eventi dal motore n8n (vedi docs/03-contratto-motore.md).
// Doppia verifica: segreto condiviso nell'header + token monouso del giro.

export const maxDuration = 60;

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

  const { data, error } = await db.rpc("apply_engine_results", {
    p_run: evt.run_id,
    p_token_hash: tokenHash,
    p_payload: body as Json,
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
  // Top-up o chiusura dopo aver risposto a n8n.
  after(() => afterResults(result));
  return NextResponse.json({ ok: result.ok, delivered: result.delivered, remaining: result.remaining });
}
