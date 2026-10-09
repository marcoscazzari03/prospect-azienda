import "server-only";
import { supabaseUrl } from "@/lib/supabase/url";

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
  n8nBaseUrl: () => process.env.N8N_BASE_URL ?? "",
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET ?? "",
  cronSecret: () => process.env.CRON_SECRET ?? "",
  resendApiKey: () => process.env.RESEND_API_KEY ?? "",
  // Facoltativo: verifica delle caselle con MillionVerifier (https://www.millionverifier.com).
  emailVerifierKey: () => (process.env.MILLIONVERIFIER_API_KEY ?? "").trim(),
  emailFrom: () => process.env.EMAIL_FROM ?? "Webora Leads <leads@weborastudio.it>",
};
