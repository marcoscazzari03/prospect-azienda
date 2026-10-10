import "server-only";

// Cloudflare Turnstile (gratuito). Attivo solo se configurato:
// NEXT_PUBLIC_TURNSTILE_SITE_KEY (pubblica) e TURNSTILE_SECRET_KEY (segreta).
export const captchaEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
// Letta a runtime sul server e passata al widget: pagina e verifica usano
// sempre la stessa configurazione (niente chiave "congelata" al momento della build).
export const captchaSiteKey = () => (captchaEnabled() ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!.trim() : "");

export async function verifyCaptcha(token: FormDataEntryValue | null, ip: string): Promise<boolean> {
  if (!captchaEnabled()) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    return Boolean(((await res.json()) as { success?: boolean }).success);
  } catch {
    return false;
  }
}
