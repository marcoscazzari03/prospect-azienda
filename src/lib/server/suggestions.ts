import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { offerChoice } from "@/lib/domain/signals";
import { getEnabledOffers } from "@/lib/server/offer-rules";
import { BUSINESS_LIMITS, haikuAnswerSchema, pickSuggestions, sanitizeAnswer, suggestionSearchInput, type StoredSuggestions, type Suggestion } from "@/lib/domain/suggestions";
import type { Json } from "@/lib/supabase/database.types";
import type { Viewer } from "@/lib/server/dal";
import { expectedLeads } from "@/lib/domain/pricing";
import { DB_SECTORS } from "@/lib/domain/db-sectors";

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
    "vendere i propri prodotti o servizi. Il database contiene aziende italiane classificate in questi settori (e solo questi):",
    DB_SECTORS.map(([name]) => name).join(" · "),
    "",
    "Dalla descrizione dell'attività:",
    "1. sells_to: «businesses» se vende soprattutto ad aziende, «both» se vende sia a privati sia ad aziende, «consumers»",
    "   se vende quasi solo a privati (parrucchiere, estetista, dentista di famiglia), «unclear» se la descrizione non basta.",
    "2. suggestions: fino a 6 tipi di AZIENDE che possono comprare da lei, solo se sells_to è businesses o both. Ognuna con:",
    "   - title: breve, in italiano, senza la zona (es. «Studi di architettura e interior design»);",
    "   - why: una frase semplice sul perché quell'azienda ne ha bisogno (massimo 140 caratteri);",
    "   - industry: ESATTAMENTE uno dei settori dell'elenco sopra, scritto uguale (es. «Studio di architettura»); settori",
    "     diversi in ogni proposta, non quasi uguali («Bar» e «Bar e caffetteria»);",
    "   - offer: il codice di uno dei servizi qui sotto SOLO se l'attività vende proprio quel servizio, altrimenti null.",
    "Per un servizio utile a quasi tutte le aziende (commercialista, pulizie, assistenza informatica, assicurazioni) scegli",
    "settori dell'elenco con molte piccole attività che ne hanno bisogno davvero (es. Ristorante, Officina auto, Impresa edile,",
    "Parrucchiere, Abbigliamento), non categorie generiche come «PMI» o «artigiani», che non sono nell'elenco.",
    "Niente aziende di cui non si può essere clienti (enti pubblici, scuole statali), niente privati, niente inventato.",
    "",
    "Servizi con segnali di bisogno (codice: nome — per chi):",
    ...offers.map((o) => `- ${o.code}: ${o.label} — ${o.description}`),
  ].join("\n");
}

// Quanti lead il database può dare per una proposta: stesso calcolo e stessa stima del wizard (availability_contacts,
// migrazione 065, ed expectedLeads): le aziende con email o modulo più una quota di quelle il cui contatto si cerca durante
// la ricerca. Si mostra il valore basso della forbice. (23/10: contare solo i contatti già noti lasciava vuote le proposte,
// perché quasi tutte le aziende nuove di OSM aspettano ancora il controllo siti.)
// Ogni conteggio lascia la risposta grezza del database in `debug` (salvata nei tentativi, per le prove dell'admin).
const debug = new Map<string, unknown>();
async function countLeads(orgId: string, s: Omit<Suggestion, "leads">, area: string, offers: Awaited<ReturnType<typeof getEnabledOffers>>) {
  const signals = s.offer ? offerChoice(s.offer, offers) : null;
  const parsed = searchInputSchema.safeParse(suggestionSearchInput(s, area, signals));
  if (!parsed.success) {
    console.error("suggestions input", parsed.error.issues[0]?.message);
    return -1;
  }
  const { data, error } = await createAdminClient().rpc("availability_contacts", {
    p_org: orgId,
    p_target: toTarget(parsed.data) as Json,
    p_contacts: 1,
    p_opportunity: parsed.data.signals.codes.length > 0,
  });
  if (error) {
    // -1 e non 0: nei tentativi salvati un errore (tempo scaduto, database occupato) si distingue da «nessuna azienda».
    console.error("suggestions availability", error.message);
    return -1;
  }
  const d = (data ?? {}) as Record<string, unknown>;
  debug.set(`${s.industry}|${s.offer ?? ""}`, { ...d, opportunity: parsed.data.signals.codes.length > 0, target: toTarget(parsed.data) });
  const n = (k: string) => Number(d[k]) || 0;
  return expectedLeads({ total: n("total"), withEmail: n("with_email"), formOnly: n("form_only"), toTry: n("to_try") }, true, 1000).min;
}

export async function generateSuggestions(orgId: string, description: string, area: string, clients: string): Promise<StoredSuggestions> {
  const key = env.anthropicApiKey();
  if (!key) throw new Error("ANTHROPIC_API_KEY mancante");
  const offers = await getEnabledOffers();
  const client = new Anthropic({ apiKey: key, timeout: 25_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000, // 1.500 troncava la risposta con 6 proposte (23/10: «Unterminated string in JSON»)
    system: prompt(offers),
    messages: [{
      role: "user",
      content: [
        `Attività: ${description}`,
        `Zona in cui cerca clienti: ${area || "tutta Italia"}`,
        clients ? `A chi vende di solito, secondo il cliente: ${clients}` : "",
      ].filter(Boolean).join("\n"),
    }],
    output_config: { format: zodOutputFormat(haikuAnswerSchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`risposta non valida (${response.stop_reason})`);
  const answer = sanitizeAnswer(response.parsed_output, offers.map((o) => o.code));
  const toCount = answer.sells_to === "businesses" || answer.sells_to === "both" ? answer.suggestions : [];
  // Due conteggi alla volta, non sei insieme: in tutta Italia ognuno impiega qualche secondo e sei in parallelo rischiano il
  // tempo massimo del database (23/10).
  const items: Suggestion[] = [];
  for (let i = 0; i < toCount.length; i += 2) {
    items.push(...await Promise.all(toCount.slice(i, i + 2).map(async (s) => {
      const leads = await countLeads(orgId, s, area, offers);
      // Con un servizio la ricerca chiede anche il segnale (per un commercialista: un annuncio per contabile), e le aziende
      // sono poche: sotto la soglia si propone la ricerca semplice dello stesso settore (23/10: 0 proposte su 6).
      if (s.offer && leads < BUSINESS_LIMITS.minLeads) {
        const plain = { ...s, offer: null };
        return { ...plain, leads: await countLeads(orgId, plain, area, offers) };
      }
      return { ...s, leads };
    })));
  }
  // Anche le proposte scartate (meno di 10 lead), per capire le risposte di Haiku nelle prove: non si mostrano.
  return { sellsTo: answer.sells_to, items: pickSuggestions(items), tried: items.map((s) => ({ title: s.title, industry: s.industry, keywords: s.keywords, offer: s.offer, leads: s.leads, db: debug.get(`${s.industry}|${s.offer ?? ""}`), at: new Date().toISOString() })) };
}
