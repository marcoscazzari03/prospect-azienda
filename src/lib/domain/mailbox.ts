// Esito del controllo di una casella email prima della consegna.
// ok: la casella esiste · catch_all: il dominio accetta qualsiasi indirizzo
// (non verificabile) · unknown: controllo non riuscito · invalid / no_mx /
// disposable: non consegnabile.
export type MailboxCheck = "ok" | "catch_all" | "unknown" | "invalid" | "no_mx" | "disposable";

export const MAILBOX_REJECTED: ReadonlySet<MailboxCheck> = new Set(["invalid", "no_mx", "disposable"]);

export const MAILBOX_LABEL: Record<MailboxCheck, string> = {
  ok: "Casella verificata: esiste",
  catch_all: "Il dominio accetta qualsiasi indirizzo: casella non verificabile",
  unknown: "Casella non verificata",
  invalid: "Casella inesistente",
  no_mx: "Il dominio non riceve posta",
  disposable: "Indirizzo temporaneo",
};

type Lead = {
  email?: { address?: string; status?: string };
  quality?: { score?: number; checks?: Record<string, unknown> };
  [k: string]: unknown;
};

// Applica gli esiti ai lead: scarta quelli non consegnabili e annota gli altri.
export function applyMailboxChecks(leads: unknown[], checks: Map<string, MailboxCheck>) {
  const kept: unknown[] = [];
  let rejected = 0;
  for (const raw of leads) {
    const lead = raw as Lead;
    const address = String(lead?.email?.address ?? "").trim().toLowerCase();
    const check = checks.get(address);
    if (!check) {
      kept.push(raw);
      continue;
    }
    if (MAILBOX_REJECTED.has(check)) {
      rejected++;
      continue;
    }
    kept.push({ ...lead, quality: { ...lead.quality, checks: { ...lead.quality?.checks, mailbox: check } } });
  }
  return { leads: kept, rejected };
}
