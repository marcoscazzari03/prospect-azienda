import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchInputSchema, splitZones, toTarget } from "@/lib/domain/search-input";
import { offerChoice } from "@/lib/domain/signals";
import { getEnabledOffers } from "@/lib/server/offer-rules";
import { haikuAnswerSchema, pickSuggestions, sanitizeAnswer, type StoredSuggestions, type Suggestion } from "@/lib/domain/suggestions";
import type { Json } from "@/lib/supabase/database.types";
import type { Viewer } from "@/lib/server/dal";

// Ricerche consigliate (punti 84–85, docs/15-ricerche-consigliate.md). Interruttore in app_settings «suggested_searches»:
// "off", "admin" (solo gli admin: prove, predefinito) o "all" (con Avvisto, dopo il 25/10).
export type SuggestedMode = "off" | "admin" | "all";

export async function getSuggestedMode(): Promise<SuggestedMode> {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "suggested_searches").maybeSingle();
    return data?.value === "off" || data?.value === "all" ? data.value : "admin";
  } catch {
    return "admin";
  }
}

export async function suggestionsVisible(viewer: Viewer) {
  const mode = await getSuggestedMode();
  return mode === "all" || (mode === "admin" && viewer.isAdmin);
}

// Modello per le proposte: veloce ed economico (circa 0,03 centesimi a proposta, registro del 22/10).
const MODEL = "claude-haiku-5-5";

function prompt(offers: { code: string; label: string; description: string }[]) {
  return [
    `Sei il consulente commerciale di ${BRAND.name}, un servizio italiano che trova AZIENDE (mai privati) a cui un'attività può`,
    "vendere i propri prodotti o servizi. Il database contiene aziende italiane con il loro settore (categorie come",
    "«Studio di architettura», «Hotel», «Ristorante», «Impresa edile», «Produzione industriale», «Agenzia immobiliare»).",
    "",
    "Dalla descrizione dell'attività:",
    "1. sells_to: «businesses» se vende soprattutto ad aziende, «both» se vende sia a privati sia ad aziende, «consumers»",
    "   se vende quasi solo a privati (parrucchiere, estetista, dentista di famiglia), «unclear» se la descrizione non basta.",
    "2. suggestions: fino a 4 tipi di AZIENDE che possono comprare da lei, solo se sells_to è businesses o both. Ognuna con:",
    "   - title: breve, in italiano, senza la zona (es. «Studi di architettura e interior design»);",
    "   - why: una frase semplice sul perché quell'azienda ne ha bisogno (massimo 140 caratteri);",
    "   - industry: il settore delle aziende da cercare, al plurale o come categoria (es. «Studi di architettura»);",
    "   - keywords: 2–5 parole in italiano che compaiono nel settore di quelle aziende (es. «architetto», «architettura»);",
    "   - offer: il codice di uno dei servizi qui sotto SOLO se l'attività vende proprio quel servizio, altrimenti null.",
    "Niente aziende di cui non si può essere clienti (enti pubblici, scuole statali), niente privati, niente inventato.",
    "",
    "Servizi con segnali di bisogno (codice: nome — per chi):",
    ...offers.map((o) => `- ${o.code}: ${o.label} — ${o.description}`),
  ].join("\n");
}

// Quanti lead il database ha già per una proposta: stesso calcolo del wizard (availability_contacts, migrazione 065),
// contando le aziende con email o con il solo modulo di contatto.
async function countLeads(orgId: string, s: Omit<Suggestion, "leads">, area: string, offers: Awaited<ReturnType<typeof getEnabledOffers>>) {
  const signals = s.offer ? offerChoice(s.offer, offers) : null;
  const parsed = searchInputSchema.safeParse({
    industry: s.industry,
    industryKeywords: s.keywords,
    countries: ["IT"],
    regions: splitZones(area, ["IT"]),
    emailMode: "company_only",
    contact: "email_or_form",
    quantity: 10,
    signals: signals ?? { codes: [], match: "any", jobFamilies: [] },
  });
  if (!parsed.success) return 0;
  const { data, error } = await createAdminClient().rpc("availability_contacts", {
    p_org: orgId,
    p_target: toTarget(parsed.data) as Json,
    p_contacts: 1,
    p_opportunity: parsed.data.signals.codes.length > 0,
  });
  if (error) {
    console.error("suggestions availability", error.message);
    return 0;
  }
  const d = (data ?? {}) as Record<string, unknown>;
  return (Number(d.with_email) || 0) + (Number(d.form_only) || 0);
}

export async function generateSuggestions(orgId: string, description: string, area: string, clients: string): Promise<StoredSuggestions> {
  const key = env.anthropicApiKey();
  if (!key) throw new Error("ANTHROPIC_API_KEY mancante");
  const offers = await getEnabledOffers();
  const client = new Anthropic({ apiKey: key, timeout: 25_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    system: prompt(offers),
    messages: [{
      role: "user",
      content: [
        `Attività: ${description}`,
        area ? `Zona in cui lavora: ${area}` : "",
        clients ? `A chi vende di solito, secondo il cliente: ${clients}` : "",
      ].filter(Boolean).join("\n"),
    }],
    output_config: { format: zodOutputFormat(haikuAnswerSchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`risposta non valida (${response.stop_reason})`);
  const answer = sanitizeAnswer(response.parsed_output, offers.map((o) => o.code));
  const toCount = answer.sells_to === "businesses" || answer.sells_to === "both" ? answer.suggestions : [];
  const items = await Promise.all(toCount.map(async (s) => ({ ...s, leads: await countLeads(orgId, s, area, offers) })));
  return { sellsTo: answer.sells_to, items: pickSuggestions(items) };
}
