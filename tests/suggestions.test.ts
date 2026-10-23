import { describe, expect, it } from "vitest";
import { aboutLeads, leadsLabel, haikuAnswerSchema, pickSuggestions, sanitizeAnswer, suggestionSearchInput, wizardHref, type Suggestion } from "@/lib/domain/suggestions";
import { searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { offerChoice } from "@/lib/domain/signals";
import { DB_SECTORS } from "@/lib/domain/db-sectors";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const s = (title: string, leads: number, extra: Partial<Suggestion> = {}): Suggestion => ({ title, why: "perché", industry: "Hotel", keywords: [], offer: null, leads, ...extra });

describe("ricerche consigliate (punti 84-85)", () => {
  it("risposta di Haiku: testi tagliati, solo settori del database con le loro parole chiave, servizio solo se attivo", () => {
    expect(haikuAnswerSchema.safeParse({ sells_to: "both", suggestions: [{ title: "PMI", why: "x", industry: "PMI", offer: null }] }).success).toBe(false);
    const raw = {
      sells_to: "both" as const,
      suggestions: [
        { title: "  Studi   di architettura ", why: "x".repeat(400), industry: "studio di architettura", offer: "web_redesign" },
        { title: "Hotel", why: "Arredi", industry: "Hotel", offer: "inventato" },
        { title: "Piccole imprese", why: "Contabilità", industry: "PMI", offer: null },
        { title: "Hotel di nuovo", why: "Doppione", industry: "Hotel", offer: null },
        { title: "", why: "", industry: "", offer: null },
      ],
    };
    const a = sanitizeAnswer(raw, ["web_redesign"]);
    expect(a.suggestions.map((s) => s.industry)).toEqual(["Studio di architettura", "Hotel"]);
    expect(a.suggestions[0]).toMatchObject({ title: "Studi di architettura", keywords: ["architetti", "architetto", "architettura", "progettazione"], offer: "web_redesign" });
    expect(a.suggestions[0].why.length).toBe(160);
    expect(a.suggestions[1].offer).toBeNull();
  });

  it("i settori proposti sono gli stessi di OpenStreetMap (lib-osm.js), con le stesse parole chiave", () => {
    const lib = readFileSync(join(process.cwd(), "n8n", "annunci", "nodes", "lib-osm.js"), "utf8");
    const settori = new Function(`${lib}; return SETTORI;`)() as Record<string, Record<string, [string, string[]]>>;
    const attesi = new Map<string, Set<string>>();
    for (const tipo of Object.values(settori)) for (const [nome, parole] of Object.values(tipo)) {
      if (!attesi.has(nome)) attesi.set(nome, new Set());
      parole.forEach((p) => attesi.get(nome)!.add(p));
    }
    expect(DB_SECTORS.map(([n, k]) => [n, [...k]])).toEqual([...attesi].map(([n, k]) => [n, [...k]]));
  });

  it("solo proposte con almeno 10 lead, le più ricche prima, al massimo 3", () => {
    expect(pickSuggestions([s("a", 9), s("b", 50), s("c", 10), s("d", 300), s("e", 12)]).map((x) => x.title)).toEqual(["d", "b", "e"]);
  });

  it("link al wizard già compilato, con il servizio solo se c'è", () => {
    const semplice = new URL(wizardHref(s("Hotel e B&B", 40, { industry: "Hotel", keywords: ["hotel", "albergo"] }), "Modena"), "https://x.it");
    expect(semplice.pathname).toBe("/app/ricerche/nuova");
    expect(Object.fromEntries(semplice.searchParams)).toEqual({ settore: "Hotel", nome: "Hotel e B&B", parole: "hotel,albergo", zona: "Modena" });
    const servizio = new URL(wizardHref(s("Siti da rifare", 40, { offer: "web_redesign" }), ""), "https://x.it");
    expect(servizio.searchParams.get("servizio")).toBe("web_redesign");
    expect(servizio.searchParams.get("tipo")).toBe("opportunita");
    expect(servizio.searchParams.has("zona")).toBe(false);
  });

  it("«circa X»: esatto sotto 10, poi arrotondato per difetto", () => {
    expect([aboutLeads(7), aboutLeads(47), aboutLeads(123)]).toEqual([7, 45, 120]);
    expect([leadsLabel(47), leadsLabel(500), leadsLabel(501)]).toEqual(["circa 45 lead", "circa 500 lead", "oltre 500 lead"]);
  });

  it("i dati di una proposta passano il controllo della ricerca, con e senza servizio (23/10: davano 0 lead a tutto)", () => {
    const semplice = searchInputSchema.safeParse(suggestionSearchInput({ industry: "Hotel", keywords: ["hotel", "albergo"] }, "Modena", null));
    expect(semplice.success).toBe(true);
    if (semplice.success) expect(toTarget(semplice.data).regions).toEqual(["Modena"]);
    const servizio = searchInputSchema.safeParse(suggestionSearchInput({ industry: "Hotel", keywords: [] }, "", offerChoice("web_redesign")));
    expect(servizio.success).toBe(true);
  });
});
