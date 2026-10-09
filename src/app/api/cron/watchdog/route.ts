import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/server/crypto";
import { closeStaleRuns } from "@/lib/server/searches";

// Chiamato da Vercel Cron: chiude i giri senza notizie e restituisce i crediti.
export async function GET(request: Request) {
  const secret = env.cronSecret();
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const closed = await closeStaleRuns();
  return NextResponse.json({ closed });
}
