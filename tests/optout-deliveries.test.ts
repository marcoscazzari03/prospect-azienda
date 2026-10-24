import { describe, expect, it } from "vitest";
import { exportColumns, flattenDelivery, withoutContact, type DeliveryRow } from "@/lib/domain/leads";

// Opposizione dopo la consegna (migrazione 073, art. 19 GDPR): contatti nascosti in app ed export.
const base: DeliveryRow = {
  id: "1",
  search_id: "s",
  data: { company: { name: "Rossi Srl", domain: "rossi.it", website: "https://rossi.it", contact_form: "https://rossi.it/contatti" }, email: { source_url: "https://rossi.it" } },
  email_address: "info@rossi.it",
  email_type: "generic",
  email_status: "found_public",
  credits: 1,
  quality_score: 50,
  delivered_at: "2026-10-20T10:00:00Z",
};

describe("lead di un'azienda che si è opposta", () => {
  it("senza opposizione resta tutto com'è", () => {
    expect(withoutContact(base)).toBe(base);
    const f = flattenDelivery(base);
    expect(f.email).toBe("info@rossi.it");
    expect(f.opposizione).toBe("");
    expect(exportColumns([f]).some((c) => c.key === "opposizione")).toBe(false);
  });

  it("con l'opposizione nasconde email, modulo e fonte", () => {
    const r = { ...base, opted_out_at: "2026-10-24T18:00:00Z" };
    const w = withoutContact(r);
    expect(w.email_address).toBe("");
    expect(w.data.company?.contact_form).toBeUndefined();
    expect(w.data.company?.name).toBe("Rossi Srl");
    const f = flattenDelivery(r);
    expect(f.email).toBe("");
    expect(f.modulo_contatto).toBe("");
    expect(f.fonte_email).toBe("");
    expect(f.opposizione).toContain("2026-10-24");
    expect(f.spunto).toBe("");
    expect(exportColumns([f]).some((c) => c.key === "opposizione")).toBe(true);
  });
});
