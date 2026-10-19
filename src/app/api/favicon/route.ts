import { NextResponse } from "next/server";

// Icona del sito di un'azienda accanto ai risultati. Passa da qui (non dal browser del cliente
// direttamente al sito dell'azienda): la CSP resta «img-src 'self'», l'azienda non vede chi la
// sta guardando e l'icona resta in cache sulla CDN. Si chiede solo a un servizio di icone
// noto (nessuna richiesta verso indirizzi scelti dall'utente): riceve solo il dominio dell'azienda.
const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

// Solo immagini raster: niente SVG (possono contenere codice) servite dal nostro dominio.
const IMAGE_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/jpeg", "image/gif", "image/webp"];

export async function GET(request: Request) {
  const domain = (new URL(request.url).searchParams.get("d") ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!DOMAIN.test(domain)) return new NextResponse(null, { status: 400 });
  try {
    // Google risponde 404 quando il sito non ha un'icona (DuckDuckGo restituiva un'immagine vuota,
    // collaudo del 19/10): così il riquadro mostra l'iniziale dell'azienda invece di uno spazio bianco.
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !IMAGE_TYPES.includes(type.split(";")[0].trim())) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400" } });
    const body = await res.arrayBuffer();
    if (body.byteLength > 100_000) return new NextResponse(null, { status: 404 });
    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
