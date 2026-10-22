import "server-only";
import { supabaseUrl } from "@/lib/supabase/url";
import { BRAND } from "@/lib/config";

// Variabili d'ambiente lette solo sul server, al momento dell'uso
// (così la build non fallisce se una variabile facoltativa manca).
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
}

export const env = {
  appUrl: () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: () => supabaseUrl(required("NEXT_PUBLIC_SUPABASE_URL")),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY").trim(),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  engineWebhookUrl: () => process.env.N8N_ENGINE_WEBHOOK_URL ?? "",
  engineHeaderName: () => process.env.N8N_ENGINE_HEADER_NAME ?? "X-Engine-Key",
  engineHeaderValue: () => process.env.N8N_ENGINE_HEADER_VALUE ?? "",
  engineCallbackSecret: () => process.env.ENGINE_CALLBACK_SECRET ?? "",
  // Solo per il controllo siti del worker sul VPS (22/10): non apre callback, annunci né import.
  siteChecksSecret: () => process.env.SITE_CHECKS_SECRET ?? "",
  n8nBaseUrl: () => process.env.N8N_BASE_URL ?? "",
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET ?? "",
  cronSecret: () => process.env.CRON_SECRET ?? "",
  resendApiKey: () => process.env.RESEND_API_KEY ?? "",
  alertEmail: () => process.env.ALERT_EMAIL ?? "", // destinatario degli avvisi di errore (facoltativo: altrimenti gli admin)
  // Facoltativo: verifica delle caselle con MillionVerifier (https://www.millionverifier.com).
  emailVerifierKey: () => (process.env.MILLIONVERIFIER_API_KEY ?? "").trim(),
  emailFrom: () => process.env.EMAIL_FROM ?? `${BRAND.name} <${BRAND.supportEmail}>`,
};
