import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui";
import { BRAND } from "@/lib/config";

// Pagina «non trovata» in italiano (punto 56): prima era quella predefinita, in inglese e senza grafica.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ledger">Errore 404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Questa pagina non esiste.</h1>
        <p className="mt-4 text-ink-2">
          Forse il link è stato copiato male. Puoi tornare alla home o scoprire <Link href="/#per-chi-e" className="text-ledger underline">per chi è {BRAND.name}</Link>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Torna alla home</ButtonLink>
          <ButtonLink href="/registrati" variant="secondary">Prova gratis</ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
