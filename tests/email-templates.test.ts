import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderEmail } from "@/lib/email/layout";
import { SUPABASE_TEMPLATES } from "@/lib/email/supabase-templates";

const DIR = "supabase/templates";

describe("email", () => {
  it("il testo degli utenti non diventa HTML", () => {
    const { html, text } = renderEmail({
      heading: "Ricerca <b>",
      paragraphs: [`La ricerca «<script>alert(1)</script>» è pronta.`],
      cta: { label: "Apri", url: `https://avvisto.it/app?a=1&b="x"` },
      footer: "Prova.",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="https://avvisto.it/app?a=1&amp;b=&quot;x&quot;"');
    expect(text).toContain("<script>"); // il testo semplice resta testo
  });

  it("i modelli di Supabase nel repository sono aggiornati", () => {
    if (process.env.WRITE_TEMPLATES) mkdirSync(DIR, { recursive: true });
    for (const t of SUPABASE_TEMPLATES) {
      const { html } = renderEmail(t.content);
      const path = `${DIR}/${t.file}`;
      // Solo il nome Avvisto (23/10: nessuna traccia del nome vecchio).
      expect(html).toContain("https://avvisto.it/email/logo-avvisto.png");
      expect(html).not.toMatch(/studio\.it/i); // nessun indirizzo del dominio vecchio
      if (process.env.WRITE_TEMPLATES) writeFileSync(path, html);
      expect(readFileSync(path, "utf8")).toBe(html);
    }
  });

  it("i link di accesso usano token_hash verso /auth/conferma", () => {
    const [conferma, reset] = SUPABASE_TEMPLATES.map((t) => renderEmail(t.content).html);
    expect(conferma).toContain("{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/app");
    expect(reset).toContain("{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/nuova-password");
  });
});
