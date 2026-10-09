import Link from "next/link";
import { Logo } from "./logo";
import { ButtonLink } from "./ui";
import { BRAND } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/#come-funziona" className="hidden rounded-md px-3 py-2 text-ink-2 hover:text-ink md:block">Come funziona</Link>
          <Link href="/prezzi" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">Prezzi</Link>
          <Link href="/accedi" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">Accedi</Link>
          <span className="hidden sm:block"><ButtonLink href="/registrati" size="sm">Prova gratis</ButtonLink></span>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-paper-2/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-2">
            Lead B2B cercati su misura, con la fonte di ogni contatto. Un servizio di {BRAND.owner}.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">Prodotto</p>
          <Link href="/prezzi" className="text-ink-2 hover:text-ink">Prezzi</Link>
          <Link href="/registrati" className="text-ink-2 hover:text-ink">Prova gratis</Link>
          <Link href="/accedi" className="text-ink-2 hover:text-ink">Accedi</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">Dati e privacy</p>
          <Link href="/privacy" className="text-ink-2 hover:text-ink">Informativa privacy</Link>
          <Link href="/termini" className="text-ink-2 hover:text-ink">Termini di servizio</Link>
          <Link href="/opposizione" className="text-ink-2 hover:text-ink">Rimuovi i tuoi dati</Link>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BRAND.owner} · {BRAND.supportEmail}
      </p>
    </footer>
  );
}
