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
          <Link href="/#faq" className="hidden rounded-md px-3 py-2 text-ink-2 hover:text-ink md:block">FAQ</Link>
          <Link href="/accedi" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">Accedi</Link>
          <span className="hidden sm:block"><ButtonLink href="/registrati" size="sm">Prova gratis</ButtonLink></span>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const col = (title: string, links: [string, string][]) => (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium">{title}</p>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="text-ink-2 hover:text-ink">{label}</Link>
      ))}
    </div>
  );
  return (
    <footer className="mt-auto border-t border-line bg-paper-2/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-2">Lead B2B con dati reali, contatti verificati e opportunità commerciali.</p>
        </div>
        {col("Prodotto", [["/#come-funziona", "Come funziona"], ["/prezzi", "Prezzi"], ["/registrati", "Prova gratis"], ["/accedi", "Accedi"]])}
        {col("Risorse", [["/#faq", "FAQ"], ["/opposizione", "Rimuovi i tuoi dati"]])}
        {col("Legale", [["/privacy", "Informativa privacy"], ["/termini", "Termini di servizio"]])}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-4 py-4 text-xs text-muted sm:px-6">
        <p>© {new Date().getFullYear()} {BRAND.name}, un servizio di {BRAND.owner}. Tutti i diritti riservati.</p>
        <p>Fatto con <span className="text-brick">♥</span> in Italia · {BRAND.supportEmail}</p>
      </div>
    </footer>
  );
}
