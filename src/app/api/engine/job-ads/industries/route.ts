import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import type { Json } from "@/lib/supabase/database.types";

// Settore delle aziende degli annunci, per il workflow n8n «Annunci | Settore aziende»
// (stesso segreto condiviso del callback del motore).
//   GET  ?limit=40   -> aziende degli annunci ancora senza settore
//   POST { results } -> settore e parole chiave (vuoto = non classificabile),
//                       salvati da store_company_industries

function authorized(request: Request) {
  const secret = env.engineCallbackSecret();
  return Boolean(secret) && safeEqual(request.headers.get("x-engine-secret") ?? "", secret!);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 40, 1), 200);
  const { data, error } = await createAdminClient().rpc("pending_industry_companies", { p_limit: limit });
  if (error) {
    console.error("pending_industry_companies", error);
    return NextResponse.json({ error: "lettura non riuscita" }, { status: 500 });
  }
  return NextResponse.json({ companies: data ?? [] });
}

const schema = z.object({
  results: z.array(z.object({
    company_id: z.string().uuid(),
    industry: z.string().max(200),
    keywords: z.array(z.string().max(80)).max(30).optional(),
  })).max(200),
});

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "esiti non validi" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("store_company_industries", { p_items: parsed.data.results as Json });
  if (error) {
    console.error("store_company_industries", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, number>) });
}
