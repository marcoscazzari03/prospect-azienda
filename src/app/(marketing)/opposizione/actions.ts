"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken, sha256Hex } from "@/lib/server/crypto";
import { sendEmail } from "@/lib/server/email";
import { clientIpHash } from "@/lib/server/request-meta";
import { verifyCaptcha } from "@/lib/server/captcha";
import { env } from "@/lib/env";

// Mai escludere interi provider di posta gratuita.
const FREE_PROVIDERS = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|libero|virgilio|tiscali|alice|tin|aol|gmx|proton|protonmail|web|orange|free)\./;

// Limiti contro l'uso del modulo per inviare email a terzi (audit V3).
const LIMITS = {
  perEmailHours: 24, // una sola email di conferma per indirizzo al giorno
  perIpPerHour: 5,
  globalPerHour: 60,
};

export type OptoutState = { ok?: boolean; error?: string };

export async function requestOptout(_: OptoutState, form: FormData): Promise<OptoutState> {
  if (form.get("website")) return { ok: true }; // honeypot anti-bot
  const parsed = z.string().trim().toLowerCase().email().max(200).safeParse(form.get("email"));
  if (!parsed.success) return { error: "Inserisci un indirizzo email valido." };

  const { ip, ipHash } = await clientIpHash("optout");
  if (!(await verifyCaptcha(form.get("cf-turnstile-response"), ip))) {
    return { error: "Verifica di sicurezza non riuscita: riprova." };
  }

  const email = parsed.data;
  const emailHash = sha256Hex(email);
  const db = createAdminClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const dayAgo = new Date(Date.now() - LIMITS.perEmailHours * 3_600_000).toISOString();

  const [{ count: perEmail }, { count: perIp }, { count: global }, { data: already }] = await Promise.all([
    db.from("optout_requests").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("created_at", dayAgo),
    ipHash
      ? db.from("optout_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo)
      : Promise.resolve({ count: 0 }),
    db.from("optout_requests").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
    db.from("suppression_list").select("id").eq("email_hash", emailHash).maybeSingle(),
  ]);

  if ((perIp ?? 0) >= LIMITS.perIpPerHour || (global ?? 0) >= LIMITS.globalPerHour) {
    return { error: "Troppe richieste in poco tempo: riprova più tardi o scrivici." };
  }
  // Già escluso o già richiesto oggi: stessa risposta, nessuna nuova email.
  if (already || (perEmail ?? 0) > 0) return { ok: true };

  const domain = email.split("@")[1];
  const wholeDomain = form.get("domain") === "on" && !FREE_PROVIDERS.test(domain);
  const token = randomToken();
  const { error } = await db.from("optout_requests").insert({
    email_hash: emailHash,
    token_hash: sha256Hex(token),
    whole_domain: wholeDomain,
    domain_hash: wholeDomain ? sha256Hex(domain) : null,
    ip_hash: ipHash,
  });
  if (error) return { error: "Non è stato possibile registrare la richiesta. Riprova." };
  await sendEmail(
    email,
    "Conferma la rimozione dei tuoi dati",
    `Hai chiesto di non comparire nei risultati della nostra piattaforma.\nConferma qui: ${env.appUrl()}/opposizione/conferma?token=${token}\n\nSe non sei stato tu, ignora questa email: non riceverai altri messaggi.`,
  );
  return { ok: true };
}
