// Link esterni mostrati nei lead (siti, fonti, LinkedIn): arrivano dal motore e
// quindi dal web. Si accettano solo indirizzi http(s) completi; tutto il resto
// (javascript:, data:, percorsi relativi, testo) diventa "nessun link". (Audit V9)
export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2000) return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  if (!url.hostname || url.username || url.password) return undefined;
  return url.href;
}
