import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import type { Json } from "@/lib/supabase/database.types";

// Popolamento del database aziende da fonti aperte, per il workflow n8n
// «Aziende | Popolamento OSM» (stesso segreto condiviso del callback del motore).
//   POST { source: "osm", companies } -> salvate da store_imported_companies
// Solo dati d'azienda (dominio, nome, sito, città, settore): nessun dato personale.

function authorized(request: Request) {
  const secret = env.engineCallbackSecret();
  return Boolean(secret) && safeEqual(request.headers.get("x-engine-secret") ?? "", secret!);
}

const schema = z.object({
  source: z.literal("osm"),
  companies: z.array(z.object({
    domain: z.string().min(3).max(200),
    name: z.string().max(300),
    website: z.string().max(300).optional(),
    city: z.string().max(120).optional(),
    province: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    industry: z.string().max(200).optional(),
    keywords: z.array(z.string().max(80)).max(10).optional(),
  })).max(5000),
});

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "aziende non valide" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("store_imported_companies", {
    p_source: parsed.data.source,
    p_items: parsed.data.companies as Json,
  });
  if (error) {
    console.error("store_imported_companies", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, number>) });
}
