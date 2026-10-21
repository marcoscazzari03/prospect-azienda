import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/server/crypto";
import { closeStaleRuns, runDueRepeats } from "@/lib/server/searches";
import { runDueAlerts } from "@/lib/server/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportError } from "@/lib/server/monitoring";

// Chiamato da Vercel Cron: chiude i giri senza notizie e restituisce i crediti,
// registra le scadenze dei crediti maturate, avvia le ricerche ricorrenti, manda gli avvisi
// settimanali (il lunedì) e
// cancella dal magazzino i dati non riverificati da 24 mesi (GDPR, audit V6).
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = env.cronSecret();
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const closed = await closeStaleRuns();
  const { data: expired, error } = await createAdminClient().rpc("expire_credits", {});
  if (error) await reportError("cron", error.message, "expire_credits");
  const repeats = await runDueRepeats();
  const alerts = await runDueAlerts();
  const { data: purged, error: purgeError } = await createAdminClient().rpc("purge_stale_warehouse", { p_months: 24 });
  if (purgeError) await reportError("cron", purgeError.message, "purge_stale_warehouse");
  // Il registro degli errori si tiene 90 giorni.
  await createAdminClient().from("error_events").delete().lt("at", new Date(Date.now() - 90 * 86_400_000).toISOString());
  return NextResponse.json({ closed, expired: expired ?? 0, repeats, alerts, purged: purged ?? null });
}
