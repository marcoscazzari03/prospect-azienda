// Destinazione dopo login / conferma email: solo pagine interne note.
// Rifiuta tutto ciò che un browser potrebbe interpretare come un altro sito
// ("//evil.com", "/\evil.com", caratteri di controllo, schemi, ecc.).
const ALLOWED = ["/app", "/admin", "/nuova-password"];

export function safeNextPath(raw: unknown, fallback = "/app"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  // Solo caratteri sicuri per un percorso con query: niente "\", spazi, controlli, ":" prima del path.
  if (!/^\/[A-Za-z0-9\-._~/?=&%+]*$/.test(raw) || raw.startsWith("//")) return fallback;
  let url: URL;
  try {
    url = new URL(raw, "https://interno.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://interno.invalid") return fallback;
  const ok = ALLOWED.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  return ok ? url.pathname + url.search : fallback;
}
