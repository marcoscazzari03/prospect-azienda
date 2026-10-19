import { describe, expect, it } from "vitest";
import { dropForeignContactForms, formOnlyLeads, urlOnDomain } from "@/lib/domain/engine";

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
