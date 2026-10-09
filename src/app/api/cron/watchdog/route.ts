import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/server/crypto";
import { closeStaleRuns, runDueRepeats } from "@/lib/server/searches";
import { createAdminClient } from "@/lib/supabase/admin";

// Chiamato da Vercel Cron: chiude i giri senza notizie e restituisce i crediti,
// registra le scadenze dei crediti maturate e avvia le ricerche ricorrenti.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = env.cronSecret();
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const closed = await closeStaleRuns();
  const { data: expired, error } = await createAdminClient().rpc("expire_credits", {});
  if (error) console.error("expire_credits", error.message);
  const repeats = await runDueRepeats();
  return NextResponse.json({ closed, expired: expired ?? 0, repeats });
}
