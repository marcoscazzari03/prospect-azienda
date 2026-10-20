import { describe, expect, it } from "vitest";
import { betaMetrics, betaVerdict } from "@/lib/domain/beta";

const at = "2026-10-21T10:00:00Z";
const base = {
  orgs: [{ id: "a", name: "Gopher", plan_id: "growth" }, { id: "b", name: "Mutart", plan_id: "growth" }, { id: "c", name: "Studio360", plan_id: "growth" }],
  owners: new Map([["a", "a@x.it"]]),
};

describe("metriche della beta", () => {
  it("conta ricerche, lead, export, contatti e risposte per cliente", () => {
    const rows = betaMetrics({
      ...base,
      searches: [{ org_id: "a", created_at: at }, { org_id: "a", created_at: at }, { org_id: "b", created_at: at }],
      deliveries: [
        { org_id: "a", stage: "contacted", delivered_at: at },
        { org_id: "a", stage: "replied", delivered_at: at },
        { org_id: "a", stage: "new", delivered_at: at },
        { org_id: "b", stage: null, delivered_at: at },
      ],
      exports: [{ org_id: "a", rows: 25, created_at: "2026-10-22T09:00:00Z" }],
      reports: [{ org_id: "b" }],
    });
    const a = rows.find((r) => r.orgId === "a")!;
    expect(a).toMatchObject({ searches: 2, delivered: 3, exports: 1, exportedRows: 25, contacted: 2, responses: 1, lastActivity: "2026-10-22T09:00:00Z" });
    expect(rows[0].orgId).toBe("a");
    const v = betaVerdict(rows);
    expect(v).toMatchObject({ active: 2, exporters: 1, responders: 1, go: false });
  });

  it("via libera con 2 clienti che esportano, una risposta e poche segnalazioni", () => {
    const rows = betaMetrics({
      ...base,
      searches: [{ org_id: "a", created_at: at }, { org_id: "b", created_at: at }],
      deliveries: Array.from({ length: 20 }, (_, i) => ({ org_id: i % 2 ? "a" : "b", stage: i === 0 ? "meeting" : "new", delivered_at: at })),
      exports: [{ org_id: "a", rows: 10, created_at: at }, { org_id: "b", rows: 10, created_at: at }],
      reports: [{ org_id: "a" }],
    });
    expect(betaVerdict(rows).go).toBe(true);
  });
});
