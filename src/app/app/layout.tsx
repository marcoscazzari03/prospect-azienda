import Link from "next/link";
import { Logo } from "@/components/logo";
import { AppNav, type NavItem } from "@/components/app-nav";
import { requireViewer } from "@/lib/server/dal";
import { formatNumber } from "@/lib/domain/pricing";
import { PlanCard, initialsOf } from "@/components/sidebar-account";
import { AccountProvider } from "@/components/header-account";

export const dynamic = "force-dynamic";

// Struttura dell'app come la bozza del 23/10 (docs/design/avvisto/): menu bianco largo 312 px, voci da 45 px, piano in fondo;
// avatar con menu in alto a destra (PageHeader).
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer();
  const items: NavItem[] = [
    { href: "/app", label: "Panoramica", icon: "home", exact: true },
    { href: "/app/ricerche/nuova", label: "Nuova ricerca", icon: "search" },
    { href: "/app/ricerche", label: "Ricerche", icon: "file", not: "/app/ricerche/nuova" },
    { href: "/app/lead", label: "Aziende e lead", icon: "users" },
    { href: "/app/crediti", label: "Crediti e piano", icon: "coins" },
    { href: "/app/account", label: "Impostazioni", icon: "gear", not: "/app/account/assistenza" },
  ];
  if (viewer.isAdmin) items.push({ href: "/admin", label: "Amministrazione", icon: "shield" });
  const secondary: NavItem[] = [
    { href: "/app/account/assistenza", label: "Guida e supporto", icon: "help" },
    { href: "/", label: "Torna al sito", icon: "back", exact: true },
  ];
  const initials = initialsOf(viewer.fullName, viewer.email);

  return (
    <AccountProvider value={{ initials, name: viewer.fullName.trim() || viewer.org.name, email: viewer.email }}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-line bg-card md:sticky md:top-0 md:flex md:h-screen md:w-[312px] md:shrink-0 md:flex-col md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 py-4 md:px-7 md:pb-[21px] md:pt-6">
            <Logo href="/app" size="lg" />
            {/* Telefono: crediti e profilo da 44 px; «Esci» è nella pagina dell'account. */}
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/app/crediti" className="flex h-11 items-center rounded-full bg-ledger-soft px-4 font-mono text-sm font-semibold text-ledger-2" aria-label={`${formatNumber(viewer.credits)} crediti disponibili`}>
                {formatNumber(viewer.credits)} cr.
              </Link>
              <Link href="/app/account" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e3dff7] text-sm font-semibold text-ledger-2" aria-label="Il mio account">
                {initials}
              </Link>
            </div>
          </div>
          <div className="px-3 pb-3 md:flex-1 md:overflow-y-auto md:px-5">
            <AppNav items={items} secondary={secondary} />
          </div>
          <div className="hidden px-[30px] pb-6 pt-3 md:block">
            <PlanCard planName={viewer.plan?.name ?? "—"} credits={viewer.credits} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 md:pb-10 md:pl-14 md:pr-10 md:pt-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </AccountProvider>
  );
}
