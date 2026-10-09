// Forma dei lead consegnati (deliveries.data) e conversione per tabelle ed export.

export type LeadData = {
  company?: { name?: string; domain?: string; website?: string; country?: string; city?: string; industry?: string; size_hint?: string };
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
};

export const ROLE_MATCH_LABEL: Record<string, string> = {
  exact: "Ruolo corrispondente",
  plausible: "Ruolo plausibile",
  unknown: "Ruolo non indicato",
};

export function flattenDelivery(d: DeliveryRow) {
  const x = d.data ?? {};
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
    email: d.email_address,
    tipo_email: EMAIL_TYPE_LABEL[d.email_type] ?? d.email_type,
    stato_email: EMAIL_STATUS_LABEL[d.email_status] ?? d.email_status,
    fonte_email: x.email?.source === "enrichment" ? "Verifica tecnica (arricchimento)" : x.email?.source_url ?? "",
    fonte_contatto: x.sources?.discovery_url ?? "",
    email_ipotizzate: (x.email_patterns ?? []).map((p) => p.address).join(", "),
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
  { key: "dimensione", label: "Dimensione" },
  { key: "nome", label: "Nome" },
  { key: "cognome", label: "Cognome" },
  { key: "ruolo", label: "Ruolo" },
  { key: "email", label: "Email" },
  { key: "tipo_email", label: "Tipo email" },
  { key: "stato_email", label: "Stato email" },
  { key: "fonte_email", label: "Fonte email" },
  { key: "fonte_contatto", label: "Fonte contatto" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email_ipotizzate", label: "Email ipotizzate (non verificate)" },
  { key: "qualita", label: "Qualità" },
  { key: "consegnato_il", label: "Consegnato il" },
  { key: "stato_contatto", label: "Stato contatto" },
  { key: "note", label: "Note" },
];
