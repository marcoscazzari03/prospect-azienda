import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import { publicDomain } from "@/lib/domain/engine";
import type { Json } from "@/lib/supabase/database.types";

// Sito delle aziende degli annunci, per il workflow n8n «Annunci | Siti aziende»
// (stesso segreto condiviso del callback del motore).
//   GET  ?limit=100  -> aziende degli annunci ancora senza sito
//   POST { results } -> esiti (dominio trovato o vuoto), salvati da store_company_resolutions

function authorized(request: Request) {
  const secret = env.engineCallbackSecret();
  return Boolean(secret) && safeEqual(request.headers.get("x-engine-secret") ?? "", secret!);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 100, 1), 500);
  const { data, error } = await createAdminClient().rpc("pending_ad_companies", { p_limit: limit });
  if (error) {
    console.error("pending_ad_companies", error);
    return NextResponse.json({ error: "lettura non riuscita" }, { status: 500 });
  }
  return NextResponse.json({ companies: data ?? [] });
}

const schema = z.object({
  results: z.array(z.object({
    company_key: z.string().min(1).max(200),
    company_name: z.string().max(300),
    city: z.string().max(120).optional(),
    domain: z.string().max(200),
    method: z.string().max(40).optional(),
  })).max(500),
});

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "esiti non validi" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("store_company_resolutions", { p_items: parsed.data.results.map((r) => (r.domain && !publicDomain(r.domain) ? { ...r, domain: "" } : r)) as Json });
  if (error) {
    console.error("store_company_resolutions", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, number>) });
}
