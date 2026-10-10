import "server-only";
import { headers } from "next/headers";
import { sha256Hex } from "./crypto";

// IP del visitatore (Vercel imposta x-forwarded-for / x-real-ip). Salvato solo come hash.
export async function clientIpHash(scope: string) {
  const h = await headers();
  const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  return { ip, ipHash: ip ? sha256Hex(`${scope}:${ip}`) : null };
}
