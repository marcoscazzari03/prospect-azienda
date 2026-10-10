"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/domain/safe-next";
import { normalizeEmail } from "@/lib/domain/email-norm";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpHash } from "@/lib/server/request-meta";
import { verifyCaptcha } from "@/lib/server/captcha";

// Registrazioni dallo stesso IP nelle ultime 24 ore (audit V4).
const SIGNUPS_PER_IP_PER_DAY = 3;

export type AuthState = { error?: string; info?: string };

const safeNext = (v: FormDataEntryValue | null) => safeNextPath(v);

const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable)\./i;

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: error.message.includes("Email not confirmed")
        ? "Conferma prima l'indirizzo email: ti abbiamo inviato un link."
        : "Email o password non corretti.",
    };
  }
  redirect(safeNext(form.get("next")));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Inserisci nome e cognome").max(100),
  company: z.string().trim().min(2, "Inserisci il nome dell'azienda").max(120),
  email: z.string().trim().toLowerCase().email("Email non valida").max(200),
  password: z.string().min(10, "La password deve avere almeno 10 caratteri").max(200),
  terms: z.literal("on", { message: "Devi accettare termini e informativa" }),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { fullName, company, email, password } = parsed.data;
  if (DISPOSABLE.test(email)) return { error: "Usa un indirizzo email aziendale o personale stabile." };

  const { ip, ipHash } = await clientIpHash("signup");
  if (!(await verifyCaptcha(form.get("cf-turnstile-response"), ip))) {
    return { error: "Verifica di sicurezza non riuscita: riprova." };
  }
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: sameIp }, { count: sameEmail }] = await Promise.all([
    ipHash
      ? db.from("profiles").select("user_id", { count: "exact", head: true }).eq("signup_ip_hash", ipHash).gte("created_at", dayAgo)
      : Promise.resolve({ count: 0 }),
    db.from("profiles").select("user_id", { count: "exact", head: true }).eq("email_norm", normalizeEmail(email)),
  ]);
  if ((sameIp ?? 0) >= SIGNUPS_PER_IP_PER_DAY) {
    return { error: "Troppe registrazioni da questa connessione. Riprova domani o scrivici." };
  }
  // Varianti dello stesso indirizzo (nome+1@, punti in Gmail): un solo account.
  if ((sameEmail ?? 0) > 0) {
    return { error: "Non è possibile creare un account con questo indirizzo. Se ne hai già uno, accedi o recupera la password." };
  }

  const supabase = await createClient();
  const plan = String(form.get("plan") ?? "");
  const next = plan ? `/app/crediti?piano=${encodeURIComponent(plan)}` : "/app";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, company },
      emailRedirectTo: `${env.appUrl()}/auth/conferma?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error("signUp", error.status, error.code, error.message);
    const m = error.message.toLowerCase();
    if (m.includes("registered")) return { error: "Non è possibile creare un account con questo indirizzo. Se ne hai già uno, accedi o recupera la password." };
    if (m.includes("rate limit")) return { error: "Troppe email inviate in poco tempo: riprova tra qualche minuto." };
    if (m.includes("database error")) return { error: "Errore del database durante la creazione dell'account (codice: DB_SIGNUP)." };
    if (m.includes("signups not allowed") || m.includes("disabled")) return { error: "Le registrazioni sono disattivate." };
    return { error: `Registrazione non riuscita (${error.code ?? error.status ?? "errore"}). Riprova.` };
  }
  if (data.user && ipHash) await db.from("profiles").update({ signup_ip_hash: ipHash }).eq("user_id", data.user.id);
  if (data.session) redirect(next);
  return { info: `Ti abbiamo inviato un'email a ${email}: apri il link per attivare l'account.` };
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl()}/auth/conferma?next=/nuova-password` });
  return { info: "Se l'indirizzo è registrato, riceverai un'email con il link per scegliere una nuova password." };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "La password deve avere almeno 10 caratteri." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Link scaduto: richiedi un nuovo reset della password." };
  redirect("/app");
}
