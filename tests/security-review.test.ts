import { describe, expect, it } from "vitest";
import { dropForeignContactForms, emailMissedDomains, formOnlyLeads, publicDomain, urlOnDomain } from "@/lib/domain/engine";

describe("ripasso di sicurezza del 19/10", () => {
  it("url sul dominio dell'azienda", () => {
    expect(urlOnDomain("https://www.ditta.it/contatti", "ditta.it")).toBe(true);
    expect(urlOnDomain("http://ditta.it", "ditta.it")).toBe(true);
    expect(urlOnDomain("https://attacker.com/x", "ditta.it")).toBe(false);
    expect(urlOnDomain("https://attacker.com/x", "x|attacker.com")).toBe(false);
    expect(urlOnDomain("http://ditta.it:80@169.254.169.254/", "ditta.it")).toBe(false);
    expect(urlOnDomain("https://169.254.169.254\\.ditta.it/", "ditta.it")).toBe(false);
    expect(urlOnDomain("https://ditta.it:8080/", "ditta.it")).toBe(false);
    expect(urlOnDomain("javascript:alert(1)//ditta.it", "ditta.it")).toBe(false);
    expect(urlOnDomain("https://nonditta.it/", "ditta.it")).toBe(false);
    expect(urlOnDomain("https://x.127.0.0.1.nip.io/", "127.0.0.1.nip.io")).toBe(false);
  });

  it("domini pubblici: niente IP, nomi interni o DNS jolly (21/10)", () => {
    expect(publicDomain("ditta.it")).toBe(true);
    expect(publicDomain("www.studio-rossi.co.uk")).toBe(true);
    for (const d of ["127.0.0.1", "169.254.169.254.nip.io", "a.sslip.io", "localtest.me", "intranet.corp", "localhost", "-a.it", ""]) {
      expect(publicDomain(d)).toBe(false);
    }
  });

  it("moduli di contatto esterni tolti dai lead, il resto invariato", () => {
    const [ok, esterno] = dropForeignContactForms([
      { company: { domain: "ditta.it", contact_form: "https://ditta.it/contatti" }, email: { address: "info@ditta.it" } },
      { company: { domain: "ditta.it", contact_form: "https://attacker.com/form", name: "Ditta" }, email: { address: "info@ditta.it" } },
    ]) as { company: Record<string, string>; email: unknown }[];
    expect(ok.company.contact_form).toBe("https://ditta.it/contatti");
    expect(esterno.company).toEqual({ domain: "ditta.it", name: "Ditta" });
    expect(esterno.email).toEqual({ address: "info@ditta.it" });
  });

  it("lead con il solo modulo: solo se il modulo è sul sito dell'azienda", () => {
    const leads = formOnlyLeads([
      { reason: "nessuna_email", company: { domain: "ditta.it", contact_form: "https://ditta.it/contatti" } },
      { reason: "nessuna_email", company: { domain: "x|attacker.com", contact_form: "https://attacker.com/x" } },
    ]);
    expect(leads).toHaveLength(1);
  });
});

describe("aziende senza email", () => {
  const r = (domain: string, reason: string, contact_form?: string) => ({ reason, company: { domain, contact_form } });
  it("solo senza email e senza modulo sul loro sito", () => {
    const rejected = [
      r("a.it", "nessuna_email"),
      r("b.it", "nessuna_email", "https://b.it/contatti"),
      r("c.it", "nessuna_email", "https://altro.it/contatti"),
      r("d.it", "fuori_target"),
      r("A.it", "nessuna_email"),
    ];
    expect(emailMissedDomains(rejected, "company_only")).toEqual(["a.it", "c.it"]);
    expect(emailMissedDomains(rejected, "personal_only")).toEqual([]);
  });
});
