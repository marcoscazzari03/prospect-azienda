import { BRAND, BRAND_KEY } from "@/lib/config";

// Grafica delle email (app e modelli di accesso di Supabase in supabase/templates/).
// HTML a tabelle con stili in linea: è quello che Gmail, Outlook e le app di posta leggono
// davvero. Il logo è un PNG (molti client non mostrano gli SVG), servito da public/email/.
// Tutto il testo passa da esc(): nomi delle ricerche e simili arrivano dagli utenti.

export type EmailContent = {
  preheader?: string; // anteprima mostrata accanto all'oggetto nella casella
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  after?: string[]; // note piccole sotto il pulsante
  footer: string; // perché si riceve questa email
};

// Colori delle email: come globals.css, viola in versione Avvisto (23/10).
const C = BRAND_KEY === "avvisto"
  ? { paper: "#f6f6fb", card: "#ffffff", ink: "#16142e", ink2: "#3b3a55", muted: "#5d5b78", line: "#e2e1ef", ledger: "#4338ca" }
  : { paper: "#f4f5f7", card: "#ffffff", ink: "#111827", ink2: "#374151", muted: "#6b7280", line: "#e3e6ea", ledger: "#148057" };
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const SITE = `https://${BRAND.domain}`;

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const p = (t: string) =>
    `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink2};">${esc(t)}</p>`;
  const small = (t: string) =>
    `<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};">${esc(t)}</p>`;
  const button = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>
<td style="border-radius:8px;background:${C.ledger};">
<a href="${esc(c.cta.url)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(c.cta.label)}</a>
</td></tr></table>
${small("Se il pulsante non funziona, copia questo indirizzo nel browser:")}
<p style="margin:0 0 16px;font-family:${SANS};font-size:13px;line-height:1.5;word-break:break-all;"><a href="${esc(c.cta.url)}" target="_blank" style="color:${C.ledger};">${esc(c.cta.url)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
${c.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
<a href="${SITE}" target="_blank" style="text-decoration:none;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${SITE}${BRAND.emailLogo}" width="32" height="32" alt="" style="display:block;border:0;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:${SERIF};font-size:20px;font-weight:bold;color:${C.ink};">${esc(BRAND.short)}${BRAND.suffix ? `<span style="color:${C.ledger};">${esc(BRAND.suffix)}</span>` : ""}</td>
</tr></table>
</a>
</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:12px;padding:32px 28px;">
<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:24px;line-height:1.3;font-weight:bold;color:${C.ink};">${esc(c.heading)}</h1>
${c.paragraphs.map(p).join("\n")}
${button}
${(c.after ?? []).map(small).join("\n")}
</td></tr>
<tr><td style="padding:20px 4px 0;">
<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted};">${esc(c.footer)}</p>
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted};">${esc(BRAND.name)} · un servizio di ${esc(BRAND.owner)} · <a href="${SITE}" target="_blank" style="color:${C.muted};">${esc(BRAND.domain)}</a> · <a href="mailto:${BRAND.supportEmail}" style="color:${C.muted};">${esc(BRAND.supportEmail)}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.flatMap((t) => [t, ""]),
    ...(c.cta ? [`${c.cta.label}: ${c.cta.url}`, ""] : []),
    ...(c.after ?? []).flatMap((t) => [t, ""]),
    `— ${BRAND.name}`,
    c.footer,
  ].join("\n");

  return { html, text };
}
