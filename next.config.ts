import type { NextConfig } from "next";
import { buildCsp } from "./src/lib/csp";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Area riservata quasi tutta per-utente: rendering dinamico classico,
  // senza Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pagine statiche: CSP senza nonce. Le pagine con nonce la ricevono dal proxy.
      {
        source: "/((?!app|admin|accedi|registrati|recupera-password|nuova-password|opposizione).*)",
        headers: [{ key: "Content-Security-Policy", value: buildCsp(undefined, process.env.NODE_ENV === "development") }],
      },
      // V11: le aree private non vanno nei motori di ricerca.
      {
        source: "/(app|admin|api|auth|accedi|registrati|recupera-password|nuova-password|opposizione/conferma)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/(app|admin|accedi|registrati|recupera-password|nuova-password|opposizione/conferma)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
