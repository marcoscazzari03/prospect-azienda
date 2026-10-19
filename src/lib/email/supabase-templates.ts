import { BRAND } from "@/lib/config";
import type { EmailContent } from "./layout";

// Modelli delle email di accesso, da incollare in Supabase (Authentication → Emails).
// I file in supabase/templates/ si rigenerano con: WRITE_TEMPLATES=1 npx vitest run tests/email-templates.test.ts
// {{ .SiteURL }}, {{ .TokenHash }} e {{ .Email }} li sostituisce Supabase.
const link = (type: string, next: string) =>
  `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=${type}&next=${next}`;
const NON_TU = "Se non sei stato tu, scrivici subito rispondendo a questa email.";

export const SUPABASE_TEMPLATES: { file: string; where: string; subject: string; content: EmailContent }[] = [
  {
    file: "conferma-account.html",
    where: "Templates → Confirm sign up",
    subject: `Conferma il tuo account ${BRAND.name}`,
    content: {
      preheader: "Un clic per attivare l'account.",
      heading: "Conferma il tuo indirizzo email",
      paragraphs: [`Benvenuto su ${BRAND.name}. Per attivare l'account conferma che questo indirizzo è tuo.`],
      cta: { label: "Attiva l'account", url: link("email", "/app") },
      after: ["Se non ti sei registrato tu, ignora questa email: l'account non verrà attivato."],
      footer: "Ricevi questa email perché questo indirizzo è stato usato per creare un account.",
    },
  },
  {
    file: "reimposta-password.html",
    where: "Templates → Reset password",
    subject: `Reimposta la password di ${BRAND.name}`,
    content: {
      preheader: "Il link per scegliere una nuova password.",
      heading: "Reimposta la password",
      paragraphs: ["Abbiamo ricevuto una richiesta per reimpostare la password del tuo account. Scegli la nuova password dal pulsante qui sotto."],
      cta: { label: "Scegli una nuova password", url: link("recovery", "/nuova-password") },
      after: ["Il link si può usare una volta sola. Se non l'hai chiesto tu, ignora questa email: la password resta quella di prima."],
      footer: "Ricevi questa email perché è stato chiesto il recupero della password del tuo account.",
    },
  },
  {
    file: "password-cambiata.html",
    where: "Security → Password changed",
    subject: `La password di ${BRAND.name} è stata cambiata`,
    content: {
      heading: "Password cambiata",
      paragraphs: ["La password dell'account {{ .Email }} è stata appena cambiata."],
      after: [NON_TU],
      footer: "Avviso di sicurezza sul tuo account.",
    },
  },
  {
    file: "2fa-attivata.html",
    where: "Security → MFA method added",
    subject: `Verifica in due passaggi attivata su ${BRAND.name}`,
    content: {
      heading: "Verifica in due passaggi attivata",
      paragraphs: ["Sull'account {{ .Email }} è stata attivata la verifica in due passaggi: da ora, all'accesso, ti chiederemo anche il codice dell'app di autenticazione."],
      after: [NON_TU],
      footer: "Avviso di sicurezza sul tuo account.",
    },
  },
  {
    file: "2fa-disattivata.html",
    where: "Security → MFA method removed",
    subject: `Verifica in due passaggi disattivata su ${BRAND.name}`,
    content: {
      heading: "Verifica in due passaggi disattivata",
      paragraphs: ["Sull'account {{ .Email }} è stata disattivata la verifica in due passaggi."],
      after: [NON_TU],
      footer: "Avviso di sicurezza sul tuo account.",
    },
  },
];
