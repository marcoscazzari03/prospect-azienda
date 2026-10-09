import "server-only";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/config";

// Email transazionali via Resend. Senza chiave configurata non fa nulla
// (le notifiche sono un di più, non devono bloccare il flusso).
export async function sendEmail(to: string, subject: string, text: string) {
  const key = env.resendApiKey();
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: [to], subject, text: `${text}\n\n— ${BRAND.name}` }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
