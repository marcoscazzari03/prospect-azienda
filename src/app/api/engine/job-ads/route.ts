import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import type { Json } from "@/lib/supabase/database.types";

// Annunci di lavoro dal workflow n8n «Annunci | Raccolta Adzuna» (stesso segreto
// condiviso del callback del motore). Filtri e controlli finali in store_job_ads.

const ad = z.object({
  external_id: z.string().min(1).max(80),
  family: z.string().min(1).max(40),
  title: z.string().min(1).max(300),
  company_name: z.string().min(1).max(300),
  country: z.string().max(2).optional(),
  region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  posted_at: z.string().max(40),
  url: z.string().url().max(800),
  description: z.string().max(2000).optional(),
  contract: z.string().max(60).optional(),
});

const schema = z.object({
  source: z.enum(["adzuna"]),
  ads: z.array(ad).max(2000),
});

export async function POST(request: Request) {
  const secret = env.engineCallbackSecret();
  const given = request.headers.get("x-engine-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "annunci non validi" }, { status: 400 });

  // Minimizzazione (analisi privacy del 24/10, checklist 98): la descrizione dell'annuncio può contenere nomi e contatti
  // di persone e non serve a niente dopo i filtri del workflow: non si salva.
  const ads = parsed.data.ads.map((a) => ({ ...a, description: "" }));
  const { data, error } = await createAdminClient().rpc("store_job_ads", {
    p_source: parsed.data.source,
    p_ads: ads as Json,
  });
  if (error) {
    console.error("store_job_ads", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, number>) });
}
