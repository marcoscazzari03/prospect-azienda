import { describe, expect, it } from "vitest";
import { monthStats, pctDelta } from "@/lib/domain/month-stats";

const row = (iso: string, credits = 1, signal = false) => ({ delivered_at: iso, credits, signal });

describe("statistiche della Panoramica", () => {
  it("variazione: percentuale, «nuovo» se il mese prima era a zero, niente senza dati", () => {
    expect(pctDelta(12, 10)).toEqual({ kind: "pct", value: 20 });
    expect(pctDelta(5, 10)).toEqual({ kind: "pct", value: -50 });
    expect(pctDelta(3, 0)).toEqual({ kind: "new" });
    expect(pctDelta(0, 0)).toBeNull();
  });

  it("mese in corso contro gli stessi giorni del mese prima", () => {
    const now = new Date("2026-10-23T10:00:00Z");
    const s = monthStats([
      row("2026-10-01T08:00:00Z", 2, true), row("2026-10-23T09:00:00Z", 3), // ottobre: 2 lead, 5 crediti, 1 con segnale
      row("2026-09-05T08:00:00Z", 1, true), row("2026-09-23T20:00:00Z", 1), // settembre fino al 23: 2 lead (il 23 alle 22 italiane)
      row("2026-09-24T08:00:00Z", 9), // dopo il 23 settembre: escluso dal confronto
      row("2026-08-30T08:00:00Z", 9), // agosto: escluso
    ], now);
    expect(s.leads.month).toBe(2);
    expect(s.credits.month).toBe(5);
    expect(s.leads.delta).toEqual({ kind: "pct", value: 0 });
    expect(s.credits.delta).toEqual({ kind: "pct", value: 150 });
    expect(s.signals.delta).toEqual({ kind: "pp", value: 0 });
  });

  it("serie degli ultimi 30 giorni, ultimo valore = oggi", () => {
    const now = new Date("2026-10-23T10:00:00Z");
    const s = monthStats([row("2026-10-23T08:00:00Z", 4), row("2026-10-22T08:00:00Z", 1), row("2026-09-10T08:00:00Z", 7)], now);
    expect(s.credits.series).toHaveLength(30);
    expect(s.credits.series.at(-1)).toBe(4);
    expect(s.credits.series.at(-2)).toBe(1);
    expect(s.credits.series.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("31 marzo contro febbraio: fino all'ultimo giorno di febbraio", () => {
    const s = monthStats([row("2027-02-28T10:00:00Z"), row("2027-03-31T10:00:00Z")], new Date("2027-03-31T10:00:00Z"));
    expect(s.leads.delta).toEqual({ kind: "pct", value: 0 });
  });
});
