"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

type Turnstile = {
  render: (el: HTMLElement, opts: { sitekey: string; language?: string }) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

// Widget Cloudflare Turnstile: aggiunge al form il campo "cf-turnstile-response".
// La chiave arriva dal server (captchaSiteKey); vuota = CAPTCHA spento.
// `resetSignal`: quando cambia (es. dopo un errore del form) il widget si
// rigenera, perché ogni token vale una sola volta.
export function Captcha({ siteKey, resetSignal }: { siteKey: string; resetSignal?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  const mount = () => {
    if (!siteKey || !box.current || !window.turnstile || id.current) return;
    id.current = window.turnstile.render(box.current, { sitekey: siteKey, language: "it" });
  };

  useEffect(() => {
    mount();
    return () => {
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  useEffect(() => {
    if (id.current && window.turnstile) window.turnstile.reset(id.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
      <div ref={box} />
    </>
  );
}
