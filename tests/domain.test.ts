import { describe, expect, it } from "vitest";
import { estimateCredits } from "@/lib/domain/pricing";
import { buildEnginePayload, enrichmentCap, nextStep } from "@/lib/domain/engine";
import { searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { toCsv } from "@/lib/domain/csv";
import { flattenDelivery } from "@/lib/domain/leads";

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
