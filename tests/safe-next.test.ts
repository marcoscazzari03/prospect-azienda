import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/domain/safe-next";
import { normalizeEmail } from "@/lib/domain/email-norm";

describe("destinazione dopo login (audit V2)", () => {
  it("accetta solo pagine interne note", () => {
    expect(safeNextPath("/app")).toBe("/app");
    expect(safeNextPath("/app/ricerche/123")).toBe("/app/ricerche/123");
    expect(safeNextPath("/app/crediti?piano=pack_100")).toBe("/app/crediti?piano=pack_100");
    expect(safeNextPath("/nuova-password")).toBe("/nuova-password");
    expect(safeNextPath("/admin/clienti")).toBe("/admin/clienti");
  });

  it("rifiuta qualsiasi redirect verso altri siti", () => {
    for (const bad of [
      "//evil.com", "/\\evil.com", "/\\/evil.com", "/\t/evil.com", "/%5Cevil.com", "https://evil.com",
      "javascript:alert(1)", "/app\\..\\..\\evil", " /app", "/applicazione", "/", "", "/api/export", "/../evil",
    ]) {
      expect(safeNextPath(bad), bad).not.toMatch(/evil|^\/api|^\/$|applicazione/);
      expect(new URL(safeNextPath(bad), "https://leads.weborastudio.it").origin).toBe("https://leads.weborastudio.it");
    }
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath(42)).toBe("/app");
  });
});

describe("email normalizzata (audit V4, come normalize_email in SQL)", () => {
  it("riconosce alias e punti di Gmail", () => {
    expect(normalizeEmail("Mario.Rossi+promo@GoogleMail.com")).toBe("mariorossi@gmail.com");
    expect(normalizeEmail("m.a.r.i.o.rossi@gmail.com")).toBe("mariorossi@gmail.com");
    expect(normalizeEmail("anna+x@azienda.it")).toBe("anna@azienda.it");
    expect(normalizeEmail("a.b@azienda.it")).toBe("a.b@azienda.it");
  });
});
