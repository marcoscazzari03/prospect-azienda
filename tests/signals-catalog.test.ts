import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CMS_RELEASES, JOB_AD_LANGUAGES, JOB_FAMILIES, SERVICES, SIGNALS, SIGNAL_RULES } from "@/lib/domain/signals";

describe("catalogo dei segnali (fase 0)", () => {
  it("codici unici e prove con freschezza coerente", () => {
    const codes = SIGNALS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of SIGNALS) expect(s.freshDays).toBe(s.source === "job_ad" ? SIGNAL_RULES.jobAdMaxAgeDays : SIGNAL_RULES.websiteFreshDays);
  });

  it("ogni servizio usa segnali e famiglie esistenti, con almeno un segnale verificato", () => {
    const families = new Set(JOB_FAMILIES.map((f) => f.code));
    for (const svc of SERVICES) {
      for (const code of svc.signals) expect(SIGNALS.some((s) => s.code === code), `${svc.code}: ${code}`).toBe(true);
      for (const f of svc.jobFamilies) expect(families.has(f), `${svc.code}: ${f}`).toBe(true);
      if (svc.signals.includes("job_ad")) expect(svc.jobFamilies.length).toBeGreaterThan(0);
      expect(svc.signals.some((c) => SIGNALS.find((s) => s.code === c)?.level === "verified") || svc.code === "hotel_booking").toBe(true);
    }
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
