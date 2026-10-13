import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { estimateCredits } from "@/lib/domain/pricing";
import { searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { VERIFIED_SIGNAL_CODES, signalPhrase, toSignalsTarget } from "@/lib/domain/signals";
import { flattenDelivery } from "@/lib/domain/leads";

const base = {
  industry: "Manifatturiero",
  industryKeywords: [],
  countries: ["IT"],
  regions: ["Lombardia"],
  roles: ["Titolare"],
  keywords: [],
  excludeKeywords: [],
  emailMode: "mixed",
  quantity: 10,
};

describe("segnali nella ricerca (fase 3)", () => {
  it("i segnali verificati coincidono con quelli del database", () => {
    const sql = readFileSync("supabase/migrations/20261022000016_signals.sql", "utf8");
    const m = sql.match(/verified_signal_codes\(\)[\s\S]*?array\[([^\]]+)\]/);
    const codes = (m?.[1] ?? "").split(",").map((c) => c.trim().replace(/'/g, ""));
    expect([...codes].sort()).toEqual([...VERIFIED_SIGNAL_CODES].sort());
  });

  it("senza segnali il target non cambia", () => {
    const t = toTarget(searchInputSchema.parse(base));
    expect("signals" in t).toBe(false);
  });

  it("annunci: famiglie con i titoli in tutte le lingue, senza doppioni", () => {
    const input = searchInputSchema.parse({ ...base, signals: { codes: ["job_ad"], jobFamilies: ["it_systems"] } });
    const s = toTarget(input).signals!;
    expect(s.codes).toEqual(["job_ad"]);
    expect(s.match).toBe("any");
    expect(s.max_age_days).toBe(60);
    expect(s.job_families[0].titles).toContain("sistemista");
    expect(s.job_families[0].titles).toContain("systemadministrator");
    expect(new Set(s.job_families[0].titles).size).toBe(s.job_families[0].titles.length);
    expect(s.job_families[0].titles.length).toBeLessThanOrEqual(80); // limite del motore
  });

  it("regole: indicativi non da soli, famiglia obbligatoria, paesi coperti, massimo 3", () => {
    const bad = (signals: object, extra: object = {}) => searchInputSchema.safeParse({ ...base, ...extra, signals }).success;
    expect(bad({ codes: ["stale_copyright"] })).toBe(false);
    expect(bad({ codes: ["stale_copyright", "no_mobile"] })).toBe(true);
    expect(bad({ codes: ["job_ad"] })).toBe(false);
    expect(bad({ codes: ["job_ad"], jobFamilies: ["hr"] }, { countries: ["PL"] })).toBe(false);
    expect(bad({ codes: ["no_mobile", "no_https", "outdated_cms", "single_language"] })).toBe(false);
    expect(bad({ codes: ["inventato"] })).toBe(false);
  });

  it("famiglie ignorate senza annunci", () => {
    expect(toSignalsTarget({ codes: ["no_mobile"], match: "all", jobFamilies: ["hr"] }).job_families).toEqual([]);
  });

  it("prezzo: +1 credito per lead con segnale", () => {
    expect(estimateCredits("mixed", 10, true)).toEqual({ min: 20, max: 40, reserve: 40 });
    expect(estimateCredits("generic_ok", 10, false)).toEqual({ min: 10, max: 20, reserve: 20 });
  });

  it("frasi sul lead: il fatto osservato con la data", () => {
    expect(signalPhrase({ code: "job_ad", evidence: { title: "Sistemista IT", date: "2026-09-28" } })).toBe(
      "Annuncio per «Sistemista IT» pubblicato il 28/09/2026",
    );
    expect(signalPhrase({ code: "outdated_cms", evidence: { detail: "WordPress 5.2 (versione del 2019-05-07)", checked_at: "2026-10-13" } })).toBe(
      "WordPress 5.2 (versione del 2019-05-07) (controllato il 13/10/2026)",
    );
    const row = flattenDelivery({
      id: "d", search_id: "s", email_address: "a@b.it", email_type: "generic", email_status: "found_public", credits: 3,
      quality_score: 80, delivered_at: "2026-10-13T10:00:00Z",
      data: { signals: [{ code: "no_mobile", evidence: { detail: "Homepage senza impostazione per dispositivi mobili", url: "https://b.it" } }] },
    });
    expect(row.segnali).toBe("Sito non adatto ai cellulari: Homepage senza impostazione per dispositivi mobili");
    expect(row.prove_segnali).toBe("https://b.it");
  });
});
