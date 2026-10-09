"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken, sha256Hex } from "@/lib/server/crypto";
import { sendEmail } from "@/lib/server/email";
import { env } from "@/lib/env";

// Mai escludere interi provider di posta gratuita.
const FREE_PROVIDERS = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|libero|virgilio|tiscali|alice|tin|aol|gmx|proton|protonmail|web|orange|free)\./;

export type OptoutState = { ok?: boolean; error?: string };

export async function requestOptout(_: OptoutState, form: FormData): Promise<OptoutState> {
  if (form.get("website")) return { ok: true }; // honeypot anti-bot
  const parsed = z.string().trim().toLowerCase().email().max(200).safeParse(form.get("email"));
  if (!parsed.success) return { error: "Inserisci un indirizzo email valido." };
  const email = parsed.data;
  const domain = email.split("@")[1];
  const wholeDomain = form.get("domain") === "on" && !FREE_PROVIDERS.test(domain);
  const token = randomToken();
  const { error } = await createAdminClient().from("optout_requests").insert({
    email_hash: sha256Hex(email),
    token_hash: sha256Hex(token),
    whole_domain: wholeDomain,
    domain_hash: wholeDomain ? sha256Hex(domain) : null,
  });
  if (error) return { error: "Non è stato possibile registrare la richiesta. Riprova." };
  await sendEmail(
    email,
    "Conferma la rimozione dei tuoi dati",
    `Hai chiesto di non comparire nei risultati della nostra piattaforma.\nConferma qui: ${env.appUrl()}/opposizione/conferma?token=${token}\n\nSe non sei stato tu, ignora questa email.`,
  );
  return { ok: true };
}
