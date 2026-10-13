import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

// V11: solo il sito pubblico è indicizzabile.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/admin", "/api", "/auth", "/accedi", "/registrati", "/recupera-password", "/nuova-password", "/opposizione/conferma"],
    },
    host: `https://${BRAND.domain}`,
  };
}
