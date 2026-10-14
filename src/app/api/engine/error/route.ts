import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/server/crypto";
import { finalizeSearch } from "@/lib/server/searches";
import { reportError } from "@/lib/server/monitoring";

// Esecuzione del motore interrotta (workflow di errore di n8n): la ricerca viene
// chiusa subito e i crediti non usati tornano al cliente, senza aspettare il
// controllo dei giri fermi. Stesso segreto condiviso del callback.

const schema = z.object({
  execution_id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(40)),
  error: z.string().max(500).optional(),
  node: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const secret = env.engineCallbackSecret();
  const given = request.headers.get("x-engine-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "evento non valido" }, { status: 400 });

  const { execution_id, error, node } = parsed.data;
  const detail = [node && `nodo «${node}»`, error].filter(Boolean).join(": ").slice(0, 300);
  const { data: searchId } = await createAdminClient().rpc("fail_engine_run", { p_execution: execution_id, p_error: detail || "esecuzione interrotta" });
  await reportError("engine", new Error(`Esecuzione n8n ${execution_id} interrotta${detail ? ` (${detail})` : ""}`), "/api/engine/error");
  if (searchId) await finalizeSearch(searchId as string, "Il motore di ricerca si è interrotto");
  return NextResponse.json({ ok: true, closed: Boolean(searchId) });
}
