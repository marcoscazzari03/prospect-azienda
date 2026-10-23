import { describe, expect, it } from "vitest";
import { aboutLeads, haikuAnswerSchema, pickSuggestions, sanitizeAnswer, wizardHref, type Suggestion } from "@/lib/domain/suggestions";

const s = (title: string, leads: number, extra: Partial<Suggestion> = {}): Suggestion => ({ title, why: "perché", industry: "Hotel", keywords: [], offer: null, leads, ...extra });

describe("ricerche consigliate (punti 84-85)", () => {
  it("risposta di Haiku: testi tagliati, parole chiave pulite, servizio solo se attivo", () => {
    const raw = haikuAnswerSchema.parse({
      sells_to: "both",
      suggestions: [
        { title: "  Studi   di architettura ", why: "x".repeat(400), industry: "Studi di architettura", keywords: ["Architetto", "architetto", "ab", "interior design"], offer: "web_redesign" },
        { title: "Hotel", why: "Arredi", industry: "Hotel", keywords: [], offer: "inventato" },
        { title: "", why: "", industry: "", keywords: [], offer: null },
      ],
    });
    const a = sanitizeAnswer(raw, ["web_redesign"]);
    expect(a.suggestions).toHaveLength(2);
    expect(a.suggestions[0]).toMatchObject({ title: "Studi di architettura", keywords: ["architetto", "interior design"], offer: "web_redesign" });
    expect(a.suggestions[0].why.length).toBe(160);
    expect(a.suggestions[1].offer).toBeNull();
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
  });
});
