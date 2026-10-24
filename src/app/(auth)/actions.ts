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
import { LOGIN_FAILURES, MFA_ATTEMPTS, RESET_REQUESTS, rateHit } from "@/lib/server/rate";
import { sha256Hex } from "@/lib/server/crypto";
import { sendEmail } from "@/lib/server/email";
import { BRAND } from "@/lib/config";

// Registrazioni dallo stesso IP nelle ultime 24 ore (audit V4).
const SIGNUPS_PER_IP_PER_DAY = 3;

export type AuthState = { error?: string; info?: string };

const safeNext = (v: FormDataEntryValue | null) => safeNextPath(v);

const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable)\./i;

const emailKey = (email: string) => sha256Hex(`email:${normalizeEmail(email.toLowerCase())}`);

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const { ip, ipHash } = await clientIpHash("login");
  if (!(await verifyCaptcha(form.get("cf-turnstile-response"), ip))) {
    return { error: "Verifica di sicurezza non riuscita: riprova." };
  }
  // Troppi tentativi sbagliati sullo stesso account o dalla stessa connessione: pausa di 15 minuti.
  const { windowSeconds: w, perAccount, perIp } = LOGIN_FAILURES;
  const account = emailKey(email);
  const [okAccount, okIp] = await Promise.all([
    rateHit(account, "login_fail", w, perAccount, false),
    ipHash ? rateHit(ipHash, "login_fail_ip", w, perIp, false) : true,
  ]);
  if (!okAccount || !okIp) return { error: "Troppi tentativi non riusciti. Attendi 15 minuti o recupera la password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (!error.message.includes("Email not confirmed")) {
      await Promise.all([
        rateHit(account, "login_fail", w, perAccount),
        ipHash ? rateHit(ipHash, "login_fail_ip", w, perIp) : null,
      ]);
    }
    return {
      error: error.message.includes("Email not confirmed")
        ? "Conferma prima l'indirizzo email: ti abbiamo inviato un link."
        : "Email o password non corretti.",
    };
  }
  // Verifica in due passaggi attiva: prima di entrare serve il codice dell'app.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/accedi/verifica?next=${encodeURIComponent(safeNext(form.get("next")))}`);
  }
  redirect(safeNext(form.get("next")));
}

// Secondo passaggio dell'accesso: codice dell'app di autenticazione.
export async function verifyMfaLogin(_: AuthState, form: FormData): Promise<AuthState> {
  const code = String(form.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Il codice ha 6 cifre." };
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  const factor = list?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect(safeNext(form.get("next")));
  // Troppi tentativi: si esce e si riparte dalla password (il limite di Supabase è per IP,
  // e qui l'IP è quello del server).
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? "";
  if (!(await rateHit(userId, "mfa_try", MFA_ATTEMPTS.windowSeconds, MFA_ATTEMPTS.max))) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Troppi tentativi. Attendi 15 minuti e accedi di nuovo." };
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "Codice non valido o scaduto: controlla l'ora del telefono e riprova." };
  redirect(safeNext(form.get("next")));
}

// Esce da un accesso lasciato a metà (es. telefono non a portata di mano).
export async function cancelMfaLogin() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/accedi");
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Inserisci nome e cognome").max(100),
  company: z.string().trim().min(2, "Inserisci il nome dell'azienda").max(120),
  email: z.string().trim().toLowerCase().email("Email non valida").max(200),
  password: z.string().min(10, "La password deve avere almeno 10 caratteri").max(200),
  terms: z.literal("on", { message: "Devi accettare termini e informativa" }),
});

// Indirizzo già registrato: stessa risposta di una registrazione riuscita, così il modulo non rivela chi è cliente
// (V10, ripasso del 21/10). Al titolare della casella arriva invece un'email con accesso e recupero password,
// al massimo una al giorno per indirizzo.
async function alreadyRegistered(email: string): Promise<AuthState> {
  if (!(await rateHit(emailKey(email), "signup_dup", 86_400, 1))) return { info: signUpInfo(email) };
  // Account mai confermato: si rimanda il link di attivazione invece dell'email «hai già un account».
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("user_id").eq("email_norm", normalizeEmail(email)).maybeSingle();
  const { data: user } = profile ? await db.auth.admin.getUserById(profile.user_id) : { data: null };
  if (user?.user && !user.user.email_confirmed_at && user.user.email?.toLowerCase() === email.toLowerCase()) {
    await (await createClient()).auth.resend({ type: "signup", email });
  } else {
    await sendEmail(email, `Hai già un account ${BRAND.name}`, {
      heading: "Hai già un account",
      paragraphs: [
        "Qualcuno, probabilmente tu, ha provato a creare un nuovo account con questo indirizzo, che è già registrato.",
        "Puoi accedere con la tua password. Se non la ricordi, scegline una nuova dalla pagina di recupero.",
      ],
      cta: { label: "Accedi", url: `${env.appUrl()}/accedi` },
      after: [`Password dimenticata: ${env.appUrl()}/recupera-password`],
      footer: "Se non sei stato tu, puoi ignorare questa email: il tuo account non è cambiato.",
    });
  }
  return { info: signUpInfo(email) };
}
const signUpInfo = (email: string) => `Ti abbiamo inviato un'email a ${email}: apri il link per attivare l'account.`;

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
  if ((sameEmail ?? 0) > 0) return alreadyRegistered(email);

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
    if (m.includes("registered")) return alreadyRegistered(email);
    if (m.includes("rate limit")) return { error: "Troppe email inviate in poco tempo: riprova tra qualche minuto." };
    if (m.includes("database error")) return { error: "Errore del database durante la creazione dell'account (codice: DB_SIGNUP)." };
    if (m.includes("signups not allowed") || m.includes("disabled")) return { error: "Le registrazioni sono disattivate." };
    return { error: `Registrazione non riuscita (${error.code ?? error.status ?? "errore"}). Riprova.` };
  }
  // Con la conferma email attiva Supabase non dà errore per un indirizzo già confermato: restituisce un utente senza
  // identità.
  if (data.user && !data.user.identities?.length) return alreadyRegistered(email);
  if (data.user && ipHash) await db.from("profiles").update({ signup_ip_hash: ipHash }).eq("user_id", data.user.id);
  if (data.session) redirect(next);
  return { info: signUpInfo(email) };
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const { ip, ipHash } = await clientIpHash("reset");
  if (!(await verifyCaptcha(form.get("cf-turnstile-response"), ip))) {
    return { error: "Verifica di sicurezza non riuscita: riprova." };
  }
  const info = "Se l'indirizzo è registrato, riceverai un'email con il link per scegliere una nuova password.";
  const { windowSeconds: w, perAccount, perIp } = RESET_REQUESTS;
  if (ipHash && !(await rateHit(ipHash, "reset_ip", w, perIp))) {
    return { error: "Troppe richieste da questa connessione. Riprova tra un'ora." };
  }
  // Stesso indirizzo chiesto troppe volte: stessa risposta, ma nessuna email in più (non si
  // rivela se l'account esiste e non si consuma il limite di invio del servizio).
  if (!(await rateHit(emailKey(email), "reset_mail", w, perAccount))) return { info };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl()}/auth/conferma?next=/nuova-password` });
  return { info };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "La password deve avere almeno 10 caratteri." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Il motivo vero (24/10: con la verifica in due passaggi attiva Supabase vuole prima il codice, e il messaggio unico
    // «Link scaduto» lo nascondeva).
    if (error.code === "insufficient_aal") redirect("/accedi/verifica?next=/nuova-password");
    if (error.code === "same_password") return { error: "La nuova password deve essere diversa da quella di prima." };
    if (error.code === "weak_password") return { error: "Password troppo debole o già comparsa in furti di dati: scegline un'altra." };
    console.error("updatePassword", error.code, error.message);
    if (error.code === "session_not_found" || error.name === "AuthSessionMissingError") {
      return { error: "Link scaduto: richiedi un nuovo reset della password." };
    }
    return { error: "Non siamo riusciti a salvare la password. Riprova, o richiedi un nuovo link." };
  }
  redirect("/app");
}
