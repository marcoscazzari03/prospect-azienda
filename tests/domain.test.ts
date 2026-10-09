import { describe, expect, it } from "vitest";
import { estimateCredits } from "@/lib/domain/pricing";
import { buildEnginePayload, enrichmentCap, enrichmentSearchBudget, maxAttemptsFor, nextStep } from "@/lib/domain/engine";
import { nextRepeatAt, searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { toCsv } from "@/lib/domain/csv";
import { flattenDelivery } from "@/lib/domain/leads";
import { roleMatcher } from "@/lib/domain/roles";
import { applyMailboxChecks } from "@/lib/domain/mailbox";

const baseInput = {
  industry: "Software house",
  industryKeywords: [],
  countries: ["IT"],
  regions: ["Milano"],
  companySizes: ["11-50"],
  roles: ["Titolare / CEO"],
  keywords: [],
  excludeKeywords: [],
  emailMode: "mixed",
  quantity: "20",
};

describe("input della ricerca", () => {
  it("valida e normalizza", () => {
    const input = searchInputSchema.parse(baseInput);
    expect(input.quantity).toBe(20);
    expect(toTarget(input).country_names).toEqual(["Italia"]);
  });
  it("rifiuta paesi inesistenti e ruoli mancanti", () => {
    expect(searchInputSchema.safeParse({ ...baseInput, countries: ["XX"] }).success).toBe(false);
    expect(searchInputSchema.safeParse({ ...baseInput, roles: [] }).success).toBe(false);
  });
});

describe("prezzi", () => {
  it("riserva il massimo della modalità", () => {
    expect(estimateCredits("generic_ok", 10)).toEqual({ min: 10, max: 20, reserve: 20 });
    expect(estimateCredits("personal_only", 10)).toEqual({ min: 20, max: 30, reserve: 30 });
  });
});

describe("motore", () => {
  const input = searchInputSchema.parse(baseInput);
  const search = { id: "s1", target: toTarget(input), email_mode: "mixed" as const, quantity: 20, delivered: 8, contacts_per_company: 1 };

  it("chiede solo i lead mancanti e limita l'arricchimento al piano", () => {
    const p = buildEnginePayload({
      search, plan: { enrichment_per_run_max: 5 }, runId: "r", runToken: "t", callbackUrl: "https://x/api/engine/callback",
      exclusions: { domains: ["a.it"], personKeys: ["mario rossi|a.it"] },
    });
    expect(p.quantity).toBe(12);
    expect(p.limits.enrichment_cap).toBe(5);
    expect(p.exclusions.domains).toEqual(["a.it"]);
  });

  it("arricchimento proporzionale alla modalità", () => {
    expect(enrichmentCap("generic_ok", 50, { enrichment_per_run_max: 100 })).toBe(10);
    expect(enrichmentCap("personal_only", 50, { enrichment_per_run_max: 100 })).toBe(50);
    expect(enrichmentCap("mixed", 50, { enrichment_per_run_max: 0 })).toBe(0);
  });

  it("arricchimento entro il budget della ricerca e del mese", () => {
    expect(enrichmentCap("personal_only", 50, { enrichment_per_run_max: 100 }, 12)).toBe(12);
    expect(enrichmentCap("personal_only", 50, { enrichment_per_run_max: 100 }, -3)).toBe(0);
    expect(enrichmentSearchBudget("personal_only", 100)).toBe(150);
    expect(enrichmentSearchBudget("generic_ok", 1000)).toBe(300);
  });

  it("ricerche grandi a tappe", () => {
    expect(maxAttemptsFor(10, "mixed")).toBe(3);
    expect(maxAttemptsFor(150, "mixed")).toBe(3);
    expect(maxAttemptsFor(500, "mixed")).toBe(7);
    expect(maxAttemptsFor(1000, "mixed")).toBe(13);
    expect(maxAttemptsFor(1000, "personal_only")).toBe(15);
    // Mercato esaurito: un giro che rende meno del 5% chiude la ricerca.
    expect(nextStep({ ok: true, remaining: 700, attempts: 4, new: 20 }, 13)).toBe("finalize");
    expect(nextStep({ ok: true, remaining: 700, attempts: 4, new: 60 }, 13)).toBe("topup");
  });

  it("decide top-up o chiusura", () => {
    expect(nextStep({ ok: true, remaining: 0, attempts: 1, new: 5 }, 3)).toBe("finalize");
    expect(nextStep({ ok: true, remaining: 4, attempts: 1, new: 0 }, 3)).toBe("topup");
    expect(nextStep({ ok: true, remaining: 4, attempts: 2, new: 0 }, 3)).toBe("finalize");
    expect(nextStep({ ok: true, remaining: 4, attempts: 3, new: 2 }, 3)).toBe("finalize");
    expect(nextStep({ ok: false, reason: "already_processed" }, 3)).toBe("none");
  });
});

describe("export", () => {
  it("CSV per Excel con protezione dalle formule", () => {
    const csv = toCsv([{ a: "=SUM(1)", b: "x;y" }], [{ key: "a", label: "A" }, { key: "b", label: "B" }]);
    expect(csv.startsWith("﻿A;B\r\n")).toBe(true);
    expect(csv).toContain("'=SUM(1)");
    expect(csv).toContain('"x;y"');
  });
  it("appiattisce un lead", () => {
    const row = flattenDelivery({
      id: "d", search_id: "s", credits: 2, quality_score: 90, delivered_at: "2026-10-09T10:00:00Z",
      email_address: "mario@acme.it", email_type: "personal", email_status: "found_public",
      data: { company: { name: "Acme" }, person: { first_name: "Mario" }, email: { source: "website", source_url: "https://acme.it/team" } },
    });
    expect(row).toMatchObject({ azienda: "Acme", nome: "Mario", tipo_email: "Nominativa", stato_email: "Trovata sul sito", fonte_email: "https://acme.it/team" });
  });
});

describe("ruoli (stesse regole del motore)", () => {
  it("alternative e sinonimi", () => {
    const m = roleMatcher(["Titolare / CEO"]);
    expect(m("CEO e Founder")).toBe("exact");
    expect(m("Proprietario")).toBe("exact");
    expect(m("Co-Founder")).toBe("plausible");
    expect(m("Office manager")).toBe("mismatch");
    expect(m("")).toBe("unknown");
    expect(roleMatcher(["Fondatore"])("Co-Founder e Google Ads Expert")).toBe("exact");
    expect(roleMatcher(["Direttore marketing"])("Head of Marketing")).toBe("plausible");
  });
});

describe("controllo caselle", () => {
  it("scarta le caselle non consegnabili e annota le altre", () => {
    const leads = [
      { email: { address: "A@x.it" }, quality: { score: 80 } },
      { email: { address: "b@morto.it" } },
      { email: { address: "c@y.it" } },
    ];
    const checks = new Map([["a@x.it", "ok" as const], ["b@morto.it", "no_mx" as const]]);
    const out = applyMailboxChecks(leads, checks);
    expect(out.rejected).toBe(1);
    expect(out.leads).toHaveLength(2);
    expect((out.leads[0] as { quality: { score: number; checks: { mailbox: string } } }).quality).toEqual({ score: 80, checks: { mailbox: "ok" } });
    expect(out.leads[1]).toBe(leads[2]);
  });
});

describe("ricerche ricorrenti", () => {
  it("prossima ripetizione, saltando quelle passate", () => {
    const now = new Date("2026-10-20T10:00:00Z");
    expect(nextRepeatAt("weekly", new Date("2026-10-13T03:00:00Z"), now).toISOString()).toBe("2026-10-27T03:00:00.000Z");
    expect(nextRepeatAt("weekly", new Date("2026-09-01T03:00:00Z"), now).toISOString()).toBe("2026-10-27T03:00:00.000Z");
    expect(nextRepeatAt("monthly", new Date("2026-10-20T03:00:00Z"), now).toISOString()).toBe("2026-11-20T03:00:00.000Z");
  });
});
