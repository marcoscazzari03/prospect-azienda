"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/server/dal";
import { MFA_FAILURES, rateHit } from "@/lib/server/rate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; info?: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Scrivi nome e cognome").max(120),
  company: z.string().trim().max(120).optional(),
});

// Nome della persona; nome dell'azienda solo per il titolare dell'account.
export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse({ fullName: form.get("fullName"), company: form.get("company") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ full_name: parsed.data.fullName }).eq("user_id", viewer.user.id);
  if (error) return { error: "Non è stato possibile salvare. Riprova." };
  if (parsed.data.company && viewer.role === "owner") {
    await db.from("organizations").update({ name: parsed.data.company }).eq("id", viewer.org.id);
  }
  revalidatePath("/app", "layout");
  return { info: "Dati salvati." };
}

// Cambio password con verifica di quella attuale; le altre sessioni vengono chiuse.
export async function changePassword(_: AccountState, form: FormData): Promise<AccountState> {
  const viewer = await requireViewer();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 10 || next.length > 200) return { error: "La nuova password deve avere almeno 10 caratteri." };
  if (next !== confirm) return { error: "Le due password non coincidono." };
  if (next === current) return { error: "La nuova password deve essere diversa da quella attuale." };
  // Controllo della password attuale con un client a parte: non tocca la sessione in uso
  // (che con la verifica in due passaggi tornerebbe al solo livello password).
  const check = createSupabaseClient(env.supabaseUrl(), env.supabaseAnonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email: viewer.email, password: current });
  if (wrong) return { error: "La password attuale non è corretta." };
  await check.auth.signOut({ scope: "local" });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "Non è stato possibile cambiare la password. Riprova." };
  await supabase.auth.signOut({ scope: "others" });
  return { info: "Password cambiata. Gli altri dispositivi sono stati disconnessi." };
}

// Esce da tutti i dispositivi, compreso questo.
export async function signOutEverywhere() {
  await requireViewer();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/accedi");
}

// ── Verifica in due passaggi (app di autenticazione, TOTP) ──────────────────────────────

const codeSchema = z.string().trim().regex(/^\d{6}$/, "Il codice ha 6 cifre.");

export type MfaSetup = { error?: string; factorId?: string; qr?: string; secret?: string };

// Primo passo: crea il fattore e restituisce il QR da inquadrare (vale solo dopo la conferma).
export async function startMfa(): Promise<MfaSetup> {
  await requireViewer();
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  if (list?.totp?.some((f) => f.status === "verified")) return { error: "La verifica in due passaggi è già attiva." };
  // Tentativi lasciati a metà: si ricomincia da capo.
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Webora Leads", issuer: "Webora Leads" });
  if (error || !data) return { error: "Non è stato possibile avviare l'attivazione. Riprova tra poco." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

// Secondo passo: il primo codice dell'app conferma il fattore (e porta la sessione al livello aal2).
export async function confirmMfa(_: AccountState, form: FormData): Promise<AccountState> {
  await requireViewer();
  const factorId = z.string().uuid().safeParse(form.get("factorId"));
  const code = codeSchema.safeParse(form.get("code"));
  if (!factorId.success) return { error: "Ricomincia l'attivazione." };
  if (!code.success) return { error: code.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: code.data });
  if (error) return { error: "Codice non valido o scaduto: controlla l'ora del telefono e riprova." };
  revalidatePath("/app/account/sicurezza");
  return { info: "Verifica in due passaggi attivata. Da ora ti chiederemo il codice a ogni accesso." };
}

// Disattivazione: serve un codice valido dell'app (chi ha solo la password non può toglierla).
export async function disableMfa(_: AccountState, form: FormData): Promise<AccountState> {
  const viewer = await requireViewer();
  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) return { error: code.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  const factors = (list?.totp ?? []).filter((f) => f.status === "verified");
  if (!factors.length) return { info: "La verifica in due passaggi non è attiva." };
  if (!(await rateHit(viewer.user.id, "mfa_fail", MFA_FAILURES.windowSeconds, MFA_FAILURES.max, false))) {
    return { error: "Troppi codici non validi. Riprova tra 15 minuti." };
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factors[0].id, code: code.data });
  if (error) {
    await rateHit(viewer.user.id, "mfa_fail", MFA_FAILURES.windowSeconds, MFA_FAILURES.max);
    return { error: "Codice non valido o scaduto." };
  }
  for (const f of factors) {
    const { error: e } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (e) return { error: "Non è stato possibile disattivarla. Riprova." };
  }
  revalidatePath("/app/account/sicurezza");
  return { info: "Verifica in due passaggi disattivata." };
}
