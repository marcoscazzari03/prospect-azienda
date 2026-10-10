"use client";
import Script from "next/script";

// Widget Cloudflare Turnstile: aggiunge al form il campo "cf-turnstile-response".
// Senza chiave pubblica configurata non mostra nulla.
export function Captcha() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="it" />
    </>
  );
}
