import { describe, expect, it } from "vitest";
import { searchInputSchema, splitZones, withSynonyms, withoutSynonyms } from "@/lib/domain/search-input";

describe("zone della ricerca", () => {
  it("divide «Campania e Sicilia» quando entrambe sono regioni", () => {
    expect(splitZones("Puglia, Campania e Sicilia")).toEqual(["Puglia", "Campania", "Sicilia"]);
    expect(splitZones("Sicilia ed Emilia-Romagna")).toEqual(["Sicilia", "Emilia-Romagna"]);
    expect(splitZones("Valle d'Aosta e Piemonte")).toEqual(["Valle d'Aosta", "Piemonte"]);
  });

  it("divide anche le città unite da «e» (QA, 21/10)", () => {
    expect(splitZones("Modena e Reggio Emilia")).toEqual(["Modena", "Reggio Emilia"]);
    expect(splitZones("Milano ed Emilia-Romagna")).toEqual(["Milano", "Emilia-Romagna"]);
  });

  it("riduce «e provincia», «provincia di» e «dintorni» al nome", () => {
    expect(splitZones("Bari e provincia")).toEqual(["Bari"]);
    expect(splitZones("Napoli e provincia, provincia di Salerno")).toEqual(["Napoli", "Salerno"]);
    expect(splitZones("Lecce (prov.)\nTorino e dintorni")).toEqual(["Lecce", "Torino"]);
    expect(splitZones("Modena e provincia e Bologna")).toEqual(["Modena", "Bologna"]);
  });

  it("lascia intere le zone con «e» nel nome", () => {
    expect(splitZones("Reggio Emilia")).toEqual(["Reggio Emilia"]);
    expect(splitZones("Trentino-Alto Adige")).toEqual(["Trentino-Alto Adige"]);
    expect(splitZones("Pesaro e Urbino, provincia di Monza e Brianza")).toEqual(["Pesaro e Urbino", "Monza e Brianza"]);
  });

  it("casi del QA e del Code Reviewer (21/10)", () => {
    expect(splitZones("province di Modena e Bologna")).toEqual(["Modena", "Bologna"]);
    expect(splitZones("Firenze e province limitrofe, Brescia e Bergamo e le loro province")).toEqual(["Firenze", "Brescia", "Bergamo"]);
    expect(splitZones("Cagliari e area metropolitana, Torino e cintura")).toEqual(["Cagliari", "Torino"]);
    expect(splitZones("tutta la Puglia, area di Milano, Bari città")).toEqual(["Puglia", "Milano", "Bari"]);
    expect(splitZones("tutta Italia")).toEqual([]);
    expect(splitZones("Sardegna (Cagliari e Sassari)")).toEqual(["Sardegna", "Cagliari", "Sassari"]);
    expect(splitZones("Milano e Monza e Brianza")).toEqual(["Milano", "Monza e Brianza"]);
    expect(splitZones("Sesto ed Uniti, Trinità d'Agultu e Vignola")).toEqual(["Sesto ed Uniti", "Trinità d'Agultu e Vignola"]);
  });

  it("sigle di provincia in maiuscolo", () => {
    expect(splitZones("MO, RE")).toEqual(["Modena", "Reggio Emilia"]);
    expect(splitZones("Bari (BA), Lecce")).toEqual(["Bari", "Lecce"]);
    expect(splitZones("Mo, no")).toEqual(["Mo", "no"]);
    expect(splitZones("Reggio (RE)")).toEqual(["Reggio Emilia"]);
    expect(splitZones("Reggio (RC)")).toEqual(["Reggio Calabria"]);
  });

  it("fuori dall'Italia niente sigle, macroaree né «Reggio»", () => {
    expect(splitZones("CA, TX", ["US"])).toEqual(["CA", "TX"]);
    expect(splitZones("Nord", ["CH"])).toEqual(["Nord"]);
    expect(splitZones("CA", ["US", "IT"])).toEqual(["Cagliari"]);
  });

  it("macroaree e «Reggio»", () => {
    expect(splitZones("Nord Est")).toEqual(["Veneto", "Trentino-Alto Adige", "Friuli-Venezia Giulia", "Emilia-Romagna"]);
    expect(splitZones("Centro e Sud Italia")).toHaveLength(10);
    expect(splitZones("Modena, Reggio e provincia")).toEqual(["Modena", "Reggio Emilia"]);
    expect(splitZones("Reggio e Messina")).toEqual(["Reggio Calabria", "Messina"]);
    expect(splitZones("Reggio")).toEqual(["Reggio"]);
    expect(splitZones("Sardegna (Sud)")).toEqual(["Sardegna", "Sud"]);
    expect(splitZones("Verona e Vicenza (e provincia)")).toEqual(["Verona", "Vicenza"]);
    expect(splitZones("Nord, Sud e Isole")).toHaveLength(16);
  });

  it("oltre 20 zone: messaggio in italiano", () => {
    const r = searchInputSchema.safeParse({ industry: "hotel", industryKeywords: [], countries: ["IT"], companySizes: [], roles: [],
      keywords: [], excludeKeywords: [], regions: Array.from({ length: 21 }, (_, i) => `Zona ${i}`), emailMode: "company_only", quantity: 10 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/Al massimo 20 zone/);
  });

  it("«/» e «&» separano, i doppioni spariscono", () => {
    expect(splitZones("Modena / Reggio Emilia & Parma")).toEqual(["Modena", "Reggio Emilia", "Parma"]);
    expect(splitZones("Bari, bari e provincia")).toEqual(["Bari"]);
  });

  it("virgola, punto e virgola e a capo come prima", () => {
    expect(splitZones("Milano, Torino\nLombardia; Veneto ")).toEqual(["Milano", "Torino", "Lombardia", "Veneto"]);
    expect(splitZones("  ")).toEqual([]);
  });
});

describe("sinonimi delle parole chiave del settore", () => {
  it("«web agency» porta «agenzia web» e «webagency»", () => {
    expect(withSynonyms(["web agency"])).toEqual(["web agency", "agenzia web", "webagency"]);
    expect(withSynonyms(["WebAgency", "grafica"])).toEqual(["WebAgency", "grafica", "web agency", "agenzia web"]);
  });

  it("plurali e ritorno alle parole del cliente («Ripeti la ricerca»)", () => {
    expect(withSynonyms(["agenzie web"])).toEqual(["agenzie web", "web agency", "webagency"]);
    const salvate = withSynonyms(["web agency", "grafica", "software house", "e-commerce"]);
    expect(withoutSynonyms(salvate)).toEqual(["web agency", "grafica", "software house", "e-commerce"]);
  });

  it("le altre parole restano come sono", () => {
    expect(withSynonyms(["hotel", "albergo"])).toEqual(["hotel", "albergo"]);
    expect(withSynonyms([])).toEqual([]);
  });
});
