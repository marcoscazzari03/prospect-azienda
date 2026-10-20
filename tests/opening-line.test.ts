import { describe, expect, it } from "vitest";
import { openingLine } from "@/lib/domain/opening-line";

const sig = (code: string, detail = "", extra: Record<string, string> = {}) => ({ code, evidence: { detail, checked_at: "2026-10-19", ...extra } });

describe("frase di apertura", () => {
  it("software vecchio e cellulari, dal testo reale della prova", () => {
    expect(openingLine([sig("outdated_cms", "WordPress 5.3.26 (versione del 2019-11-12)"), sig("no_mobile", "Homepage senza impostazione per dispositivi mobili")], "web_redesign"))
      .toBe("Buongiorno, controllando il vostro sito il 19/10/2026 ho notato che il sito usa WordPress 5.3.26, una versione del 2019 e che la homepage non è impostata per la lettura da smartphone.");
  });
  it("versione molto vecchia e certificato scaduto", () => {
    expect(openingLine([sig("outdated_cms", "WordPress 3.7.1 (prima del 2017-11-16)")])).toContain("una versione precedente al 2017");
    expect(openingLine([sig("no_https", "Certificato HTTPS scaduto")])).toContain("risulta scaduto");
  });
  it("annuncio di lavoro con titolo e data", () => {
    expect(openingLine([{ code: "job_ad", evidence: { title: "Sistemista junior", date: "2026-10-10" } }], "it_support"))
      .toBe("Buongiorno, ho visto che state cercando «Sistemista junior» (annuncio del 10/10/2026).");
  });
  it("il segnale principale del servizio viene per primo", () => {
    const s = [sig("stale_copyright", "Copyright fermo al 2019"), sig("no_https", "Certificato HTTPS autofirmato")];
    expect(openingLine(s, "site_security")).toMatch(/notato che il certificato.*non è riconosciuto.*e che il copyright del sito è fermo al 2019/);
  });
  it("nessun segnale, nessuna frase", () => {
    expect(openingLine([])).toBe("");
    expect(openingLine(undefined)).toBe("");
  });
});
