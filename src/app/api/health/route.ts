import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/url";

export const dynamic = "force-dynamic";

// Diagnosi della configurazione: nessun segreto, solo presenza e raggiungibilità.
export async function GET() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  let auth: string;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    auth = `${res.status}${res.ok ? "" : " " + (await res.text()).slice(0, 120)}`;
  } catch (e) {
    auth = `errore di rete: ${String(e).slice(0, 120)}`;
  }
  const keyKind = key.startsWith("eyJ") ? "jwt (anon)" : key.startsWith("sb_publishable_") ? "publishable" : key ? "formato sconosciuto" : "mancante";
  return NextResponse.json({
    supabase_url_configurato: raw ? new URL(raw.trim(), "https://x").href.replace(/^https:\/\/x\/?/, "(non valido) ") : "mancante",
    supabase_url_usato: url,
    anon_key: keyKind,
    service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "presente" : "mancante",
    supabase_auth: auth,
    app_url: process.env.APP_URL ?? "mancante",
    n8n_webhook: process.env.N8N_ENGINE_WEBHOOK_URL ? "presente" : "mancante",
    callback_secret: process.env.ENGINE_CALLBACK_SECRET ? "presente" : "mancante",
  });
}
