import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "@/lib/domain/safe-url";
import { buildCsp } from "@/lib/csp";

describe("link esterni dei lead (audit V9)", () => {
  it("accetta solo http(s) completi", () => {
    expect(safeHttpUrl("https://www.acme.it/contatti")).toBe("https://www.acme.it/contatti");
    expect(safeHttpUrl("http://acme.it")).toBe("http://acme.it/");
    expect(safeHttpUrl(" https://linkedin.com/in/mario ")).toBe("https://linkedin.com/in/mario");
  });
  it("scarta schemi pericolosi, relativi e credenziali", () => {
    for (const v of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "/app", "acme.it", "", "https://user:pw@acme.it", null, 42]) {
      expect(safeHttpUrl(v)).toBeUndefined();
    }
  });
});

describe("CSP", () => {
  it("con nonce: niente inline né eval in produzione", () => {
    const csp = buildCsp("abc");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
