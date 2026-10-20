import { describe, expect, it } from "vitest";
import { splitZones } from "@/lib/domain/search-input";

describe("zone della ricerca", () => {
  it("divide «Campania e Sicilia» quando entrambe sono regioni", () => {
    expect(splitZones("Puglia, Campania e Sicilia")).toEqual(["Puglia", "Campania", "Sicilia"]);
    expect(splitZones("Sicilia ed Emilia-Romagna")).toEqual(["Sicilia", "Emilia-Romagna"]);
    expect(splitZones("Valle d'Aosta e Piemonte")).toEqual(["Valle d'Aosta", "Piemonte"]);
  });

  it("lascia intere le zone che non sono due regioni", () => {
    expect(splitZones("Reggio Emilia")).toEqual(["Reggio Emilia"]);
    expect(splitZones("Bari e provincia")).toEqual(["Bari e provincia"]);
    expect(splitZones("Trentino-Alto Adige")).toEqual(["Trentino-Alto Adige"]);
  });

  it("virgola, punto e virgola e a capo come prima", () => {
    expect(splitZones("Milano, Torino\nLombardia; Veneto ")).toEqual(["Milano", "Torino", "Lombardia", "Veneto"]);
    expect(splitZones("  ")).toEqual([]);
  });
});
