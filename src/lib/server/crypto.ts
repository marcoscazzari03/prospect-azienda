import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");

// Deve coincidere con public.sha256_hex in SQL (minuscolo, trim).
export const sha256Hex = (value: string) => createHash("sha256").update(value.trim().toLowerCase(), "utf8").digest("hex");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
