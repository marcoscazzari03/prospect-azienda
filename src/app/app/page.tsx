import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader, Stat } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { closeStaleRuns } from "@/lib/server/searches";
import { formatNumber } from "@/lib/domain/pricing";

export const metadata: Metadata = { title: "Panoramica" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  await closeStaleRuns(viewer.org.id);
  const supabase = await createClient();
  const [{ data: searches }, { count: leads }, { count: personal }, { data: reserved }] = await Promise.all([
    supabase.from("searches").select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at, repeat").order("created_at", { ascending: false }).limit(6),
    supabase.from("deliveries").select("id", { count: "exact", head: true }),
    supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("email_type", "personal"),
    supabase.from("searches").select("credits_reserved, credits_charged").in("status", ["queued", "running"]),
  ]);
  const inFlight = (reserved ?? []).reduce((s, r) => s + r.credits_reserved - r.credits_charged, 0);
  const active = (searches ?? []).filter((s) => ["queued", "running"].includes(s.status)).length;
  const firstName = viewer.fullName.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={viewer.org.name}
        title={firstName ? `Ciao ${firstName}` : "Panoramica"}
        description="Le tue ricerche, i lead consegnati e i crediti a disposizione."
        actions={<ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Crediti disponibili" value={formatNumber(viewer.credits)} tone="ledger" hint={inFlight ? `${inFlight} riservati per ricerche in corso` : `Piano ${viewer.plan?.name}`} />
        <Stat label="Lead acquistati" value={formatNumber(leads ?? 0)} hint={`${personal ?? 0} con email nominativa`} />
        <Stat label="Ricerche in corso" value={active} tone={active ? "stamp" : "ink"} />
        <Stat label="Quota nominative" value={leads ? `${Math.round(((personal ?? 0) / leads) * 100)}%` : "—"} hint="Sul totale dei lead" />
      </div>

      <h2 className="mb-4 mt-12 font-display text-2xl font-semibold">Ultime ricerche</h2>
      {searches?.length ? (
        <SearchTable searches={searches as SearchListItem[]} />
      ) : (
        <EmptyState
          title="Nessuna ricerca, per ora"
          action={<ButtonLink href="/app/ricerche/nuova">Avvia la prima ricerca</ButtonLink>}
        >
          Descrivi i clienti che cerchi: settore, paese, ruoli. Con i crediti gratuiti puoi ricevere i primi lead in pochi minuti.
        </EmptyState>
      )}
    </>
  );
}
