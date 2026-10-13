import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/server/email";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/config";

// Monitoraggio leggero (audit, fase 3): ogni errore del server finisce in
// error_events e l'admin riceve un'email. Lo stesso errore viene segnalato al
// massimo una volta all'ora, e in tutto non più di MAX_EMAILS_PER_HOUR email.
const MAX_EMAILS_PER_HOUR = 6;

async function alertRecipients(): Promise<string[]> {
  const fixed = env.alertEmail();
  if (fixed) return [fixed];
  const db = createAdminClient();
  const { data: admins } = await db.from("profiles").select("user_id").eq("is_admin", true).limit(3);
  const emails = await Promise.all(
    (admins ?? []).map(async (a) => (await db.auth.admin.getUserById(a.user_id)).data.user?.email ?? ""),
  );
  return emails.filter(Boolean);
}

export async function reportError(source: string, error: unknown, route = "", digest?: string) {
  try {
    const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 1000);
    const signature = createHash("sha256").update(`${source}|${route}|${message.replace(/[0-9a-f-]{8,}/gi, "#")}`).digest("hex").slice(0, 32);
    const db = createAdminClient();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const [{ count: same }, { count: sent }] = await Promise.all([
      db.from("error_events").select("id", { count: "exact", head: true }).eq("signature", signature).eq("emailed", true).gte("at", hourAgo),
      db.from("error_events").select("id", { count: "exact", head: true }).eq("emailed", true).gte("at", hourAgo),
    ]);
    const email = !same && (sent ?? 0) < MAX_EMAILS_PER_HOUR;
    await db.from("error_events").insert({ signature, source, route: route.slice(0, 300), message, digest: digest ?? null, emailed: email });
    if (!email) return;
    const to = await alertRecipients();
    const text = [
      `Errore sul server di ${BRAND.name}.`,
      ``,
      `Dove: ${source}${route ? ` · ${route}` : ""}`,
      `Messaggio: ${message}`,
      digest ? `Digest: ${digest}` : "",
      `Quando: ${new Date().toISOString()}`,
      ``,
      `Gli stessi errori della prossima ora vengono registrati senza nuove email (tabella error_events su Supabase).`,
    ].filter((l) => l !== "").join("\n");
    await Promise.all(to.map((addr) => sendEmail(addr, `[${BRAND.short}] Errore: ${message.slice(0, 80)}`, text)));
  } catch (e) {
    console.error("reportError", e);
  }
}
