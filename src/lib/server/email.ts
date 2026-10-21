import "server-only";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/config";
import { renderEmail, type EmailContent } from "@/lib/email/layout";

// Email transazionali via Resend. Senza chiave configurata non fa nulla
// (le notifiche sono un di più, non devono bloccare il flusso).
// Con un EmailContent parte l'email con la grafica del prodotto (HTML + testo semplice);
// con una stringa solo testo (avvisi interni).
export async function sendEmail(to: string, subject: string, body: string | EmailContent) {
  const key = env.resendApiKey();
  if (!key || !to) return false;
  const content = typeof body === "string" ? { text: `${body}\n\n— ${BRAND.name}` } : renderEmail(body);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: [to], subject, ...content }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
