import { offerByCode, type LeadSignal } from "./signals";

// Frase di apertura per il primo messaggio, costruita solo dalla prova del segnale (decisione del
// 20/10): niente AI, quindi nessun dettaglio inventato e costo zero. Dà del «voi» all'azienda e
// descrive il fatto osservato, senza giudizi né promesse. Il cliente la adatta prima di inviarla.

const giorno = (iso?: string) => {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

// Un fatto osservato sul sito, come proposizione da unire alle altre («il vostro sito …»).
function fatto(s: LeadSignal): string {
  const d = String(s.evidence?.detail ?? "");
  switch (s.code) {
    case "outdated_cms": {
      // «WordPress 5.3.26 (versione del 2019-11-12)» oppure «WordPress 3.7.1 (prima del 2017-11-16)»
      const m = d.match(/^([A-Za-z]+)\s+([\d.]+)\s*\((versione del|prima del)\s+(\d{4})/);
      if (!m) return "il sito usa una versione non aggiornata del suo software";
      return m[3] === "versione del"
        ? `il sito usa ${m[1]} ${m[2]}, una versione del ${m[4]}`
        : `il sito usa ${m[1]} ${m[2]}, una versione precedente al ${m[4]}`;
    }
    case "no_mobile":
      return "la homepage non è impostata per la lettura da smartphone";
    case "no_https":
      if (/scaduto/i.test(d)) return "il certificato di sicurezza (HTTPS) del sito risulta scaduto";
      if (/autofirmato/i.test(d)) return "il certificato di sicurezza (HTTPS) del sito non è riconosciuto dai browser";
      if (/non valido/i.test(d)) return "il certificato di sicurezza (HTTPS) non corrisponde all'indirizzo del sito e i browser mostrano un avviso";
      return "il sito non ha la connessione sicura HTTPS";
    case "single_language":
      return /lingua: it\b/i.test(d) ? "il sito è solo in italiano" : "il sito è disponibile in una sola lingua";
    case "stale_copyright": {
      const y = d.match(/(\d{4})/)?.[1];
      return y ? `il copyright del sito è fermo al ${y}` : "il sito sembra non essere aggiornato da tempo";
    }
    case "under_construction":
      return "il sito al momento mostra una pagina provvisoria";
    case "no_booking_engine":
      return "sul sito non c'è un sistema di prenotazione online";
    default:
      return "";
  }
}

export function openingLine(signals: LeadSignal[] | undefined, offerCode?: string): string {
  if (!signals?.length) return "";
  // Prima i segnali del servizio venduto, nell'ordine del servizio; il primo decide il tipo di frase.
  const offer = offerCode ? offerByCode(offerCode) : undefined;
  const rank = (c: string) => (offer ? offer.signals.indexOf(c) + 1 || 99 : 0);
  const ordered = [...signals].sort((a, b) => rank(a.code) - rank(b.code));
  const first = ordered[0];
  if (first.code === "job_ad") {
    const title = String(first.evidence?.title ?? "").trim();
    const quando = giorno(first.evidence?.date);
    return `Buongiorno, ho visto che state cercando ${title ? `«${title}»` : "una nuova figura"}${quando ? ` (annuncio del ${quando})` : ""}.`;
  }
  const sito = ordered.filter((s) => s.code !== "job_ad");
  const fatti = sito.map(fatto).filter(Boolean).slice(0, 2);
  if (!fatti.length) return "";
  const quando = giorno(sito[0].evidence?.checked_at);
  return `Buongiorno, controllando il vostro sito${quando ? ` il ${quando}` : ""} ho notato che ${fatti.join(" e che ")}.`;
}
