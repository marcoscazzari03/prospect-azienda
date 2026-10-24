import { opportunityScore, signalByCode, signalPhrase, type LeadSignal } from "./signals";
import { openingLine } from "./opening-line";

// Forma dei lead consegnati (deliveries.data) e conversione per tabelle ed export.

export type LeadData = {
  company?: { name?: string; domain?: string; website?: string; country?: string; city?: string; industry?: string; size_hint?: string; contact_form?: string };
  person?: { full_name?: string; first_name?: string; last_name?: string; job_title?: string; role_match?: string; linkedin_url?: string };
  email?: {
    address?: string;
    type?: "personal" | "generic";
    status?: "found_public" | "validated" | "unverified";
    source?: "website" | "enrichment";
    source_url?: string;
    alternatives?: { address: string; type: string; status: string; source_url?: string }[];
  };
  email_patterns?: { address: string; status: "guessed" }[];
  sources?: { discovery_url?: string; contact_page?: string };
  quality?: { score?: number; checks?: Record<string, unknown> };
  origin?: { source?: "warehouse"; verified_at?: string };
  signals?: LeadSignal[];
};

export type DeliveryRow = {
  id: string;
  search_id: string;
  data: LeadData;
  email_address: string;
  email_type: string;
  email_status: string;
  credits: number;
  quality_score: number;
  delivered_at: string;
  stage?: LeadStage;
  notes?: string;
  archived_at?: string | null;
  // Azienda che si è opposta dopo la consegna (migrazione 073): contatto nascosto, da non contattare.
  opted_out_at?: string | null;
  lead_list_items?: { list_id: string }[];
};

// Avanzamento commerciale del contatto, gestito dal cliente.
export const LEAD_STAGES = ["new", "contacted", "replied", "meeting", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "Da contattare",
  contacted: "Contattato",
  replied: "Ha risposto",
  meeting: "Appuntamento",
  won: "Cliente",
  lost: "Non interessato",
};

export const EMAIL_STATUS_LABEL: Record<string, string> = {
  found_public: "Trovata sul sito",
  validated: "Verificata",
  unverified: "Non verificata",
  guessed: "Ipotizzata",
};

export const EMAIL_TYPE_LABEL: Record<string, string> = {
  personal: "Nominativa",
  generic: "Generica",
  form: "Solo modulo di contatto",
};

export const ROLE_MATCH_LABEL: Record<string, string> = {
  exact: "Ruolo corrispondente",
  plausible: "Ruolo plausibile",
  unknown: "Ruolo non indicato",
};

// `offers`: servizio scelto in ogni ricerca (search_id -> codice), per l'attinenza del punteggio.
// Lead di un'azienda che si è opposta dopo la consegna (migrazione 073): senza email, modulo ed email ipotizzate.
export function withoutContact(r: DeliveryRow): DeliveryRow {
  if (!r.opted_out_at) return r;
  const d = r.data ?? {};
  return {
    ...r,
    email_address: "",
    data: { ...d, company: d.company ? { ...d.company, contact_form: undefined } : d.company, email: undefined, email_patterns: undefined },
  };
}

export function flattenDelivery(d: DeliveryRow, offers: Record<string, string | undefined> = {}) {
  const x = d.data ?? {};
  const opp = opportunityScore(x.signals, offers[d.search_id]);
  const no = Boolean(d.opted_out_at);
  return {
    azienda: x.company?.name ?? "",
    sito: x.company?.website ?? "",
    dominio: x.company?.domain ?? "",
    paese: x.company?.country ?? "",
    citta: x.company?.city ?? "",
    settore: x.company?.industry ?? "",
    dimensione: x.company?.size_hint ?? "",
    nome_completo: x.person?.full_name ?? "",
    nome: x.person?.first_name ?? "",
    cognome: x.person?.last_name ?? "",
    ruolo: x.person?.job_title ?? "",
    linkedin: x.person?.linkedin_url ?? "",
    email: no ? "" : d.email_address,
    tipo_email: EMAIL_TYPE_LABEL[d.email_type] ?? d.email_type,
    stato_email: d.email_type === "form" ? "" : EMAIL_STATUS_LABEL[d.email_status] ?? d.email_status,
    fonte_email: no ? "" : x.email?.source === "enrichment" ? "Verifica tecnica (arricchimento)" : x.email?.source_url ?? "",
    modulo_contatto: no ? "" : x.company?.contact_form ?? "",
    opposizione: no ? `Si è opposta il ${String(d.opted_out_at).slice(0, 10)}: non contattarla e cancella i suoi dati` : "",
    fonte_contatto: x.sources?.discovery_url ?? "",
    email_ipotizzate: no ? "" : (x.email_patterns ?? []).map((p) => p.address).join(", "),
    segnali: (x.signals ?? []).map((sg) => `${signalByCode(sg.code)?.label ?? sg.code}: ${signalPhrase(sg)}`).join(" | "),
    prove_segnali: (x.signals ?? []).map((sg) => sg.evidence?.url ?? "").filter(Boolean).join(" "),
    spunto: openingLine(x.signals, offers[d.search_id]),
    punteggio_opportunita: opp ? opp.score : "",
    livello_opportunita: opp ? `Opportunità ${opp.level}` : "",
    qualita: d.quality_score,
    crediti: d.credits,
    consegnato_il: d.delivered_at?.slice(0, 10) ?? "",
    stato_contatto: d.stage ? LEAD_STAGE_LABEL[d.stage] : "",
    note: d.notes ?? "",
  };
}

export const EXPORT_COLUMNS: { key: keyof ReturnType<typeof flattenDelivery>; label: string }[] = [
  { key: "azienda", label: "Azienda" },
  { key: "sito", label: "Sito" },
  { key: "paese", label: "Paese" },
  { key: "citta", label: "Città" },
  { key: "settore", label: "Settore" },
  { key: "dimensione", label: "Dimensione (stimata)" },
  { key: "nome", label: "Nome" },
  { key: "cognome", label: "Cognome" },
  { key: "ruolo", label: "Ruolo" },
  { key: "email", label: "Email" },
  { key: "tipo_email", label: "Tipo email" },
  { key: "stato_email", label: "Stato email" },
  { key: "fonte_email", label: "Fonte email" },
  { key: "modulo_contatto", label: "Pagina modulo di contatto" },
  { key: "opposizione", label: "Opposizione" },
  { key: "fonte_contatto", label: "Fonte azienda" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email_ipotizzate", label: "Email ipotizzate (non verificate)" },
  { key: "segnali", label: "Perché è in target" },
  { key: "prove_segnali", label: "Prova del segnale" },
  { key: "spunto", label: "Spunto per il primo messaggio" },
  { key: "punteggio_opportunita", label: "Punteggio opportunità (0-100)" },
  { key: "livello_opportunita", label: "Livello opportunità" },
  { key: "consegnato_il", label: "Consegnato il" },
  { key: "stato_contatto", label: "Fase commerciale" },
  { key: "note", label: "Note" },
];

// Colonne della persona: solo se almeno un lead ha il referente (in «Solo azienda» mai).
const PERSON_COLUMNS = new Set(["nome", "cognome", "ruolo", "linkedin", "email_ipotizzate"]);
// Colonne dell'opportunità: solo se almeno un lead ha un segnale.
const OPPORTUNITY_COLUMNS = new Set(["punteggio_opportunita", "livello_opportunita", "spunto"]);
export function exportColumns(rows: ReturnType<typeof flattenDelivery>[]) {
  const people = rows.some((r) => r.nome);
  const opportunities = rows.some((r) => r.punteggio_opportunita !== "");
  const optouts = rows.some((r) => r.opposizione);
  return EXPORT_COLUMNS.filter((c) => (people || !PERSON_COLUMNS.has(c.key)) && (opportunities || !OPPORTUNITY_COLUMNS.has(c.key)) && (optouts || c.key !== "opposizione"));
}

// Avviso sull'uso dei contatti (pagine dei lead ed export Excel). Pubblicare un indirizzo sul
// sito non equivale a consentire comunicazioni promozionali (Garante, 2026).
// Testi rivisti il 24/10 (analisi privacy, checklist punto 98): art. 130, Registro delle opposizioni, ditte individuali, ODbL.
export const CONTACT_NOTICE = [
  "Un'email pubblicata sul sito di un'azienda non è un consenso a ricevere pubblicità.",
  "In Italia email, SMS e chiamate automatiche a scopo promozionale richiedono il consenso del destinatario, anche quando è un'azienda (art. 130 del Codice Privacy).",
  "Per le telefonate con un operatore controlla prima i numeri nel Registro pubblico delle opposizioni.",
  "Usa questi dati per contatti mirati e personali, uno per azienda, non per invii di massa; il modulo di contatto si compila a mano.",
  "Se l'azienda è una ditta individuale o un professionista, al primo contatto di' chi sei e dove hai trovato i suoi dati.",
  "Rispetta sempre chi ti chiede di non essere più contattato. Se hai dubbi sul tuo caso, chiedi a un consulente.",
  "Parte dei dati proviene da OpenStreetMap (© OpenStreetMap contributors, licenza ODbL): se pubblichi gli elenchi, cita la fonte.",
];

// Servizio scelto in ogni ricerca opportunità (search_id -> codice del servizio).
export function offersBySearch(searches: { id: string; target: unknown }[] | null | undefined) {
  return Object.fromEntries((searches ?? []).map((s) => [s.id, (s.target as { signals?: { offer?: string } } | null)?.signals?.offer]));
}
