import Link from "next/link";
import { Logo } from "@/components/logo";
import { AppNav, type NavItem } from "@/components/app-nav";
import { requireViewer } from "@/lib/server/dal";
import { formatNumber } from "@/lib/domain/pricing";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer();
  const items: NavItem[] = [
    { href: "/app", label: "Panoramica", icon: "home", exact: true },
    { href: "/app/ricerche/nuova", label: "Nuova ricerca", icon: "plus" },
    { href: "/app/ricerche", label: "Ricerche", icon: "list", exact: true },
    { href: "/app/lead", label: "Lead", icon: "users" },
    { href: "/app/crediti", label: "Crediti e piano", icon: "coin" },
  ];
  if (viewer.isAdmin) items.push({ href: "/admin", label: "Amministrazione", icon: "shield" });
  items.push({ href: "/", label: "Torna al sito", icon: "back", exact: true });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
          <Logo href="/app" />
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/app/crediti" className="font-mono text-sm font-semibold text-ledger">{formatNumber(viewer.credits)} cr.</Link>
            <form action="/auth/esci" method="post"><button className="text-xs text-ink-2">Esci</button></form>
          </div>
        </div>
        <div className="px-3 pb-3 md:flex-1">
          <AppNav items={items} />
        </div>
        <div className="hidden border-t border-line p-4 md:block">
          <Link href="/app/crediti" className="ruled block rounded-lg border border-line bg-paper p-3 hover:border-ink-2">
            <p className="text-xs text-muted">Crediti disponibili</p>
            <p className="font-mono text-2xl font-semibold text-ledger">{formatNumber(viewer.credits)}</p>
            <p className="text-xs text-muted">Piano {viewer.plan?.name ?? "—"}</p>
          </Link>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted" title={viewer.email}>{viewer.org.name}</p>
            <form action="/auth/esci" method="post">
              <button className="text-xs text-ink-2 underline-offset-4 hover:underline">Esci</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
