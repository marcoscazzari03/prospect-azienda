import { Logo } from "@/components/logo";
import { AppNav, type NavItem } from "@/components/app-nav";
import { requireAdmin } from "@/lib/server/dal";

export const dynamic = "force-dynamic";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Andamento", icon: "home", exact: true },
  { href: "/admin/clienti", label: "Clienti", icon: "users" },
  { href: "/admin/ricerche", label: "Ricerche e motore", icon: "list" },
  { href: "/admin/segnalazioni", label: "Segnalazioni e GDPR", icon: "shield" },
  { href: "/admin/costi", label: "Prezzi e costi", icon: "coin" },
  { href: "/app", label: "Torna all'app", icon: "back" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-ink text-paper md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0">
        <div className="px-5 py-5 [&_span]:!text-paper">
          <Logo href="/admin" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-stamp">Amministrazione</p>
        </div>
        <div className="px-3 pb-3 [&_a]:text-paper/80 [&_a:hover]:bg-white/10 [&_a[aria-current=page]]:bg-paper [&_a[aria-current=page]]:text-ink">
          <AppNav items={ITEMS} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
