import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { workerAuthorized } from "@/lib/server/worker-auth";
import { publicDomain } from "@/lib/domain/engine";
import type { Json } from "@/lib/supabase/database.types";

// Contatti per tutto il database (punto 86, migrazione 066), per il worker sul VPS (`worker/contacts.mjs`).
//   GET  ?limit=100 -> aziende con il sito vivo e senza email né modulo, da cercare nelle pagine «Contatti», «Note legali»…
//   POST { items }  -> email e modulo trovati, salvati da store_contact_checks (solo del dominio dell'azienda)

export async function GET(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 100, 1), 300);
  const { data, error } = await createAdminClient().rpc("pending_contact_checks", { p_limit: limit });
  if (error) {
    console.error("pending_contact_checks", error);
    return NextResponse.json({ error: "lettura non riuscita" }, { status: 500 });
  }
  return NextResponse.json({ companies: (data ?? []).filter((c) => publicDomain(c.domain)) });
}

const schema = z.object({
  items: z.array(z.object({
    domain: z.string().min(3).max(200),
    email: z.string().max(200).optional(),
    contact_form: z.string().max(300).optional(),
    pages_read: z.number().int().min(0).max(10),
  })).max(300),
});

export async function POST(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "esiti non validi" }, { status: 400 });
  const { data, error } = await createAdminClient().rpc("store_contact_checks", {
    p_items: parsed.data.items.filter((i) => publicDomain(i.domain)) as Json,
  });
  if (error) {
    console.error("store_contact_checks", error);
    return NextResponse.json({ error: "salvataggio non riuscito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, number> | null) });
}
