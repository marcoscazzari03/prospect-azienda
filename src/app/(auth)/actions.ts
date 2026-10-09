"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthState = { error?: string; info?: string };

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
};

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
  if (error) return { error: error.message.includes("registered") ? "Esiste già un account con questa email." : "Registrazione non riuscita. Riprova." };
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
