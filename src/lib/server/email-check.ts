import "server-only";
import { resolve4, resolveMx } from "node:dns/promises";
import { env } from "@/lib/env";
import type { MailboxCheck } from "@/lib/domain/mailbox";

// Controllo delle caselle prima della consegna:
// 1. il dominio deve ricevere posta (record MX), sempre e gratis;
// 2. con MILLIONVERIFIER_API_KEY, verifica che la singola casella esista.
// Un errore del controllo non scarta mai un lead (esito "unknown").

const PARALLEL = 16;

async function domainReceivesMail(domain: string): Promise<boolean | null> {
  try {
    const mx = await resolveMx(domain);
    return mx.some((r) => r.exchange && r.exchange !== ".");
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ENOTFOUND") return false;
    if (code === "ENODATA") {
      // Senza MX la posta può andare al record A del dominio.
      try {
        return (await resolve4(domain)).length > 0;
      } catch {
        return false;
      }
    }
    return null; // timeout o errore DNS: non sappiamo
  }
}

async function verifyMailbox(address: string, key: string): Promise<MailboxCheck> {
  try {
    const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(key)}&email=${encodeURIComponent(address)}&timeout=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7_000) });
    if (!res.ok) return "unknown";
    const result = String(((await res.json()) as { result?: string }).result ?? "").toLowerCase();
    return (["ok", "catch_all", "invalid", "disposable"] as const).find((r) => r === result) ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>, deadline: number) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
      while (next < items.length && Date.now() < deadline) await worker(items[next++]);
    }),
  );
}

export async function checkMailboxes(addresses: string[], budgetMs = 60_000) {
  const deadline = Date.now() + budgetMs;
  const unique = [...new Set(addresses.map((a) => a.trim().toLowerCase()).filter((a) => a.includes("@")))];
  const results = new Map<string, MailboxCheck>();

  const domains = [...new Set(unique.map((a) => a.split("@")[1]))];
  const mail = new Map<string, boolean | null>();
  await pool(domains, async (d) => void mail.set(d, await domainReceivesMail(d)), deadline);

  // Se nessun dominio risulta raggiungibile il problema è il DNS, non i domini.
  if (domains.length > 2 && [...mail.values()].every((v) => v === false)) for (const d of domains) mail.set(d, null);

  const toVerify: string[] = [];
  for (const a of unique) {
    const receives = mail.get(a.split("@")[1]);
    if (receives === false) results.set(a, "no_mx");
    else toVerify.push(a);
  }

  const key = env.emailVerifierKey();
  let apiCalls = 0;
  if (key) {
    await pool(toVerify, async (a) => {
      apiCalls++;
      results.set(a, await verifyMailbox(a, key));
    }, deadline);
  }
  for (const a of toVerify) if (!results.has(a)) results.set(a, "unknown");
  return { results, apiCalls };
}
