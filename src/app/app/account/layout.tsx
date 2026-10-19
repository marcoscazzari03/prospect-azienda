import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { AccountNav } from "./account-nav";

// «Il mio account»: menu delle sezioni a sinistra, una pagina per sezione.
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  const name = viewer.fullName.trim();
  const initials = (name ? name.split(/\s+/).map((w) => w[0]) : [viewer.email[0] ?? "?"]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <PageHeader title="Il mio account" description="Profilo, sicurezza, piano e fatture." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Sezioni dell'account" className="min-w-0 lg:sticky lg:top-10 lg:self-start">
          <div className="mb-4 hidden items-center gap-3 lg:flex">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ledger-soft text-sm font-semibold text-ledger">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{name || viewer.email}</span>
              <span className="block truncate text-xs text-muted">{viewer.org.name}</span>
            </span>
          </div>
          <AccountNav />
        </nav>
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </>
  );
}
