import "server-only";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/server/crypto";

// Route del worker sul VPS (controllo siti, contatti, popolamento OSM): segreto del callback del motore (n8n) oppure SITE_CHECKS_SECRET,
// che apre solo queste route. Almeno 32 caratteri.
export function workerAuthorized(request: Request) {
  const given = request.headers.get("x-engine-secret") ?? "";
  return [env.engineCallbackSecret(), env.siteChecksSecret()].some((secret) => secret.length >= 32 && safeEqual(given, secret));
}
