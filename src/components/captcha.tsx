"use client";
import Script from "next/script";

// Widget Cloudflare Turnstile: aggiunge al form il campo "cf-turnstile-response".
// La chiave arriva dal server (captchaSiteKey); vuota = CAPTCHA spento.
export function Captcha({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="it" />
    </>
  );
}
