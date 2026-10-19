import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { estimateCredits } from "@/lib/domain/pricing";
import { defaultSearchName, searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { OFFERS, VERIFIED_SIGNAL_CODES, applyOfferRules, opportunityScore, describeOffer, describeOpportunity, offerChoice, validateOfferRule, extraCreditsLabel, signalExtraRange, signalPhrase, toSignalsTarget } from "@/lib/domain/signals";
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

  it("prezzo: crediti in più per lead con segnale, il più alto tra quelli scelti", () => {
    expect(estimateCredits("mixed", 10, 1)).toEqual({ min: 20, max: 40, reserve: 40 });
    expect(estimateCredits("generic_ok", 10)).toEqual({ min: 10, max: 20, reserve: 20 });
    const prices = { website: 1, job_ad: 3 };
    expect(signalExtraRange(prices, ["no_mobile", "job_ad", "stale_copyright"])).toEqual({ min: 1, max: 3 });
    expect(signalExtraRange(prices, ["stale_copyright"])).toEqual({ min: 0, max: 0 });
    expect(estimateCredits("generic_ok", 10, signalExtraRange(prices, ["no_mobile", "job_ad"]))).toEqual({ min: 20, max: 50, reserve: 50 });
    expect(extraCreditsLabel({ website: 1, job_ad: 1 })).toBe("+1 credito");
    expect(extraCreditsLabel(prices)).toBe("+1 credito con segnali dal sito, +3 crediti con annunci di lavoro");
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

  it("anteprima: solo i segnali che decidono, indicativi come informazione in più", () => {
    expect(
      describeOpportunity({ codes: ["job_ad"], match: "any", jobFamilies: ["it_systems"], industry: "Aziende manifatturiere", where: "Lombardia" }),
    ).toBe(
      "Cercheremo aziende manifatturiere in Lombardia con un annuncio di lavoro per «Sistemista / tecnico IT» negli ultimi 60 giorni. Ogni segnale ha una prova (link e data): le aziende senza prova vengono escluse.",
    );
    const t = describeOpportunity({ codes: ["no_mobile", "no_https", "stale_copyright"], match: "all", jobFamilies: [], industry: "Hotel", where: "" });
    expect(t).toContain("con il sito non adatto ai cellulari e il sito senza connessione sicura.");
    expect(t).toContain("come informazione in più, il sito fermo da tempo.");
    expect(describeOpportunity({ codes: ["stale_copyright"], match: "any", jobFamilies: [], industry: "x", where: "" })).toBe("");
  });

  it("servizio venduto: la regola viene dal catalogo (e dalle modifiche dell'admin)", () => {
    const rule = offerChoice("translation")!;
    expect(rule).toMatchObject({ offer: "translation", codes: ["single_language"], match: "any" });
    const t = toTarget(searchInputSchema.parse({ ...base, signals: rule })).signals!;
    expect(t.offer).toBe("translation");
    expect(t.look_for).toContain("una sola lingua");
    expect(searchInputSchema.safeParse({ ...base, signals: { offer: "inventato", codes: [] } }).success).toBe(false);
  });

  it("regole dell'admin: applicate se valide, ignorate se no, servizi nascosti", () => {
    const offers = applyOfferRules({
      translation: { signals: ["single_language", "stale_copyright"], match: "all", lookFor: "un sito solo in italiano e fermo da anni" },
      wp_maintenance: { signals: ["stale_copyright"] }, // solo indicativo: non valida
      graphic_design: { enabled: false },
    });
    const tr = offers.find((o) => o.code === "translation")!;
    expect(tr).toMatchObject({ signals: ["single_language", "stale_copyright"], match: "all", customized: true, enabled: true });
    expect(offerChoice("translation", offers)!.lookFor).toBe("un sito solo in italiano e fermo da anni");
    expect(offers.find((o) => o.code === "wp_maintenance")).toMatchObject({ signals: ["outdated_cms"], customized: false });
    expect(offers.find((o) => o.code === "graphic_design")!.enabled).toBe(false);
  });

  it("validazione delle regole", () => {
    const ok = { signals: ["outdated_cms"], jobFamilies: [], match: "any" as const, lookFor: "un sito con software vecchio" };
    expect(validateOfferRule(ok)).toBeNull();
    expect(validateOfferRule({ ...ok, signals: [] })).toMatch(/almeno un segnale/);
    expect(validateOfferRule({ ...ok, signals: ["stale_copyright"] })).toMatch(/verificato/);
    expect(validateOfferRule({ ...ok, signals: ["job_ad"] })).toMatch(/figura/);
    expect(validateOfferRule({ ...ok, signals: ["no_https", "no_mobile", "outdated_cms", "single_language"] })).toMatch(/massimo|Al massimo/i);
    expect(validateOfferRule({ ...ok, lookFor: "corto" })).toMatch(/cosa cerchiamo/);
  });

  it("ogni servizio produce una ricerca valida in Italia", () => {
    for (const o of OFFERS) {
      const r = searchInputSchema.safeParse({ ...base, signals: offerChoice(o.code) });
      expect(r.success, o.code).toBe(true);
    }
  });

  it("servizi con annunci: solo nei paesi coperti", () => {
    expect(searchInputSchema.safeParse({ ...base, countries: ["PL"], signals: offerChoice("it_support") }).success).toBe(false);
    expect(searchInputSchema.safeParse({ ...base, countries: ["PL"], signals: offerChoice("translation") }).success).toBe(true);
  });

  it("anteprima del servizio in parole semplici", () => {
    expect(describeOffer({ offer: "wp_maintenance", industry: "Studi dentistici", where: "Lombardia" })).toBe(
      "Cercheremo studi dentistici in Lombardia con un sito WordPress, Joomla o WooCommerce con una versione uscita da più di 2 anni. Ogni lead ha la prova (link e data): le aziende senza prova vengono escluse.",
    );
  });
  it("opportunità: «tutti i settori» ammesso solo con un servizio", () => {
    const tutti = searchInputSchema.safeParse({ ...base, industry: "", signals: offerChoice("it_support") });
    expect(tutti.success).toBe(true);
    if (tutti.success) {
      expect(toTarget(tutti.data).industry).toBe("");
      expect(defaultSearchName(tutti.data)).toBe("Assistenza IT e sistemistica · Lombardia");
    }
    expect(searchInputSchema.safeParse({ ...base, industry: "" }).success).toBe(false);
    expect(searchInputSchema.safeParse({ ...base, industry: "ab", signals: offerChoice("it_support") }).success).toBe(false);
    expect(describeOffer({ offer: "translation", industry: "", where: "Veneto" })).toMatch(/^Cercheremo aziende di ogni settore in Veneto/);
  });
});

describe("punteggio dell'opportunità", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  it("nessun segnale: nessun punteggio", () => {
    expect(opportunityScore([], "web_redesign", now)).toBeNull();
  });
  it("prova forte, attinente e recente: opportunità forte", () => {
    const o = opportunityScore([{ code: "outdated_cms", evidence: { checked_at: "2026-10-15" } }], "wp_maintenance", now)!;
    expect(o.score).toBe(85);
    expect(o.level).toBe("forte");
  });
  it("indizio debole e vecchio: opportunità potenziale", () => {
    const o = opportunityScore([{ code: "stale_copyright", evidence: { checked_at: "2026-07-01" } }], "web_redesign", now)!;
    expect(o.score).toBe(Math.round(40 * 0.85 * 0.6));
    expect(o.level).toBe("potenziale");
  });
  it("stesso segnale, servizio diverso: cambia l'attinenza", () => {
    const sig = [{ code: "single_language", evidence: { checked_at: "2026-10-18" } }];
    expect(opportunityScore(sig, "translation", now)!.score).toBeGreaterThan(opportunityScore(sig, "web_redesign", now)!.score);
  });
  it("più segnali: bonus, massimo 100", () => {
    const o = opportunityScore([
      { code: "job_ad", evidence: { date: "2026-10-17" } },
      { code: "no_https", evidence: { checked_at: "2026-10-18" } },
      { code: "outdated_cms", evidence: { checked_at: "2026-10-18" } },
    ], "cybersecurity", now)!;
    expect(o.score).toBe(Math.min(100, 90 + 16));
  });
  it("export: punteggio e livello", () => {
    const row = flattenDelivery({
      id: "1", search_id: "s1", email_address: "info@a.it", email_type: "generic", email_status: "found_public", credits: 2, quality_score: 63,
      delivered_at: "2026-10-19T10:00:00Z", data: { company: { name: "A" }, signals: [{ code: "outdated_cms", evidence: { checked_at: new Date().toISOString().slice(0, 10) } }] },
    }, { s1: "wp_maintenance" });
    expect(row.punteggio_opportunita).toBe(85);
    expect(row.livello_opportunita).toBe("Opportunità forte");
  });
});
