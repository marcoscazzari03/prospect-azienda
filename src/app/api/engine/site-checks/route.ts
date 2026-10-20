import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import type { Json } from "@/lib/supabase/database.types";

// Controllo dei siti del database, per il workflow n8n «Aziende | Controllo siti»
// (stesso segreto condiviso del callback del motore).
//   GET  ?limit=80  -> aziende da controllare (mai controllate o da più di 25 giorni)
//   POST { items }  -> esiti dei controlli, salvati da store_company_checks (origine «seed»)

function authorized(request: Request) {
  const secret = env.engineCallbackSecret();
  return Boolean(secret) && safeEqual(request.headers.get("x-engine-secret") ?? "", secret!);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 80, 1), 300);
  const { data, error } = await createAdminClient().rpc("pending_site_checks", { p_limit: limit });
  if (error) {
    console.error("pending_site_checks", error);
    return NextResponse.json({ error: "lettura non riuscita" }, { status: 500 });
  }
  return NextResponse.json({ companies: data ?? [] });
}

const schema = z.object({
  items: z.array(z.object({
    company: z.object({
      domain: z.string().min(3).max(200),
      name: z.string().max(300).optional(),
      website: z.string().max(300).optional(),
      technologies: z.array(z.string().max(40)).max(10).optional(),
      email: z.string().max(200).optional(), // email aziendale dalla homepage (migrazione 050)
    }),
    checks: z.array(z.object({
      code: z.string().max(40),
      status: z.enum(["pass", "fail", "undetermined"]),
      evidence: z.record(z.string(), z.unknown()).optional(),
    })).max(10),
  })).max(300),
});

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "esiti non validi" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("store_company_checks", {
    p_items: parsed.data.items as Json,
    p_target: {},
    p_origin: "seed",
  });
  if (error) {
    console.error("store_company_checks", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, saved: data ?? 0 });
}
