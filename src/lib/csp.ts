// Content Security Policy (audit V9).
// Le pagine dinamiche (area clienti, admin, accesso, opposizione) usano un nonce
// generato dal proxy a ogni richiesta: solo gli script con quel nonce partono.
// Le pagine statiche del sito non possono avere un nonce: per loro vale la
// variante con 'unsafe-inline', comunque limitata alle origini note.
const TURNSTILE = "https://challenges.cloudflare.com";

// Percorsi serviti con il nonce (devono essere dinamici). Tenere allineati il
// matcher in src/proxy.ts e l'esclusione in next.config.ts.
export const NONCE_PREFIXES = ["/app", "/admin", "/accedi", "/registrati", "/recupera-password", "/nuova-password", "/opposizione"];

export function buildCsp(nonce?: string, dev = false) {
  const script = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline' ${TURNSTILE}`;
  return [
    "default-src 'self'",
    `script-src ${script}${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${TURNSTILE}`,
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
