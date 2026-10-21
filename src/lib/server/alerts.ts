import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { reportError } from "./monitoring";
import { sendEmail } from "./email";

// Avviso settimanale delle opportunità (migrazione 056): chiamato dal cron notturno, gira il lunedì.
// Il database conta le aziende nuove (mai segnalate, non consegnate) e le segna; qui si manda l'email.
// Nessun credito: il pulsante apre la ricerca precompilata e il cliente decide se avviarla.
export async function runDueAlerts() {
  const db = createAdminClient();
  const { data: due, error } = await db.rpc("due_search_alerts", { p_limit: 50 });
  if (error) {
    await reportError("cron", error.message, "due_search_alerts");
    return { checked: 0, sent: 0 };
  }
  let sent = 0;
  for (const a of due ?? []) {
    const { data: esito, error: runError } = await db.rpc("run_search_alert", { p_search: a.search_id });
    if (runError) {
      await reportError("cron", runError.message, "run_search_alert");
      continue;
    }
    const r = esito?.[0];
    if (!r?.sent) continue;
    const { data: profile } = await db.from("profiles").select("email").eq("user_id", a.user_id).maybeSingle();
    const quante = r.new_count > 500 ? "Più di 500" : String(r.new_count);
    const ok = await sendEmail(profile?.email ?? "", `${quante} nuove aziende con opportunità per «${a.name}»`, {
      preheader: "Nessun credito speso: decidi tu se avviare la ricerca.",
      heading: `${quante} nuove aziende per «${a.name}»`,
      paragraphs: [
        `Questa settimana abbiamo trovato ${quante.toLowerCase()} aziende nuove che corrispondono alla tua ricerca.`,
        "Se avvii la ricerca, le aziende si scelgono tra tutte quelle disponibili, nuove comprese. Non hai speso crediti: li usi solo se la avvii.",
      ],
      cta: { label: "Apri la ricerca", url: `${env.appUrl()}/app/ricerche/nuova?da=${a.search_id}` },
      footer: `Ricevi questa email perché hai attivato l'avviso settimanale su «${a.name}». Puoi disattivarlo dalla pagina della ricerca: ${env.appUrl()}/app/ricerche/${a.search_id}`,
    });
    // Le aziende sono già segnate come segnalate: un invio fallito va almeno registrato.
    if (ok) sent++;
    else await reportError("cron", `Avviso settimanale non inviato (ricerca ${a.search_id})`, "alerts");
  }
  return { checked: due?.length ?? 0, sent };
}
