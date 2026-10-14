import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CMS_RELEASES, JOB_AD_LANGUAGES, JOB_FAMILIES, OFFERS, OFFER_AREAS, SIGNALS, SIGNAL_RULES } from "@/lib/domain/signals";

describe("catalogo dei segnali (fase 0)", () => {
  it("codici unici e prove con freschezza coerente", () => {
    const codes = SIGNALS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of SIGNALS) expect(s.freshDays).toBe(s.source === "job_ad" ? SIGNAL_RULES.jobAdMaxAgeDays : SIGNAL_RULES.websiteFreshDays);
  });

  it("ogni servizio: area esistente, segnali e figure esistenti, almeno un segnale verificato, massimo 3", () => {
    const families = new Set(JOB_FAMILIES.map((f) => f.code));
    const areas = new Set(OFFER_AREAS.map((a) => a.code));
    expect(new Set(OFFERS.map((o) => o.code)).size).toBe(OFFERS.length);
    for (const o of OFFERS) {
      expect(areas.has(o.area), o.code).toBe(true);
      expect(o.signals.length).toBeLessThanOrEqual(SIGNAL_RULES.maxSignalsPerSearch);
      for (const code of o.signals) expect(SIGNALS.some((s) => s.code === code), `${o.code}: ${code}`).toBe(true);
      for (const f of o.jobFamilies) expect(families.has(f), `${o.code}: ${f}`).toBe(true);
      expect(o.signals.includes("job_ad") === o.jobFamilies.length > 0, o.code).toBe(true);
      expect(o.signals.some((c) => SIGNALS.find((s) => s.code === c)?.level === "verified"), o.code).toBe(true);
      expect(o.lookFor.length).toBeGreaterThan(10);
    }
    for (const a of OFFER_AREAS) expect(OFFERS.some((o) => o.area === a.code), a.code).toBe(true);
  });

  it("titoli degli annunci in tutte le lingue, minuscoli e senza accenti", () => {
    for (const f of JOB_FAMILIES) {
      for (const lang of JOB_AD_LANGUAGES) {
        expect(f.titles[lang].length, `${f.code}/${lang}`).toBeGreaterThan(0);
        for (const t of f.titles[lang]) expect(t, `${f.code}/${lang}`).toMatch(/^[a-z0-9 \-/]+$/);
      }
    }
  });

  it("date di rilascio dei CMS in ordine", () => {
    for (const list of Object.values(CMS_RELEASES)) {
      expect(list.length).toBeGreaterThan(4);
      const dates = list.map(([, d]) => d);
      expect([...dates].sort()).toEqual(dates);
    }
  });

  it("ogni pagina di prova ha un esito atteso", () => {
    const dir = "n8n/engine/test/fixtures/signals";
    const expected = JSON.parse(readFileSync(`${dir}/expected.json`, "utf8")) as { fixtures: Record<string, unknown> };
    for (const name of Object.keys(expected.fixtures)) expect(readFileSync(`${dir}/${name}`, "utf8")).toContain("<html");
  });
});
