import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { ActivityCard, LeadsChart, PipelineCard, StatCard, ToolsCard } from "@/components/dashboard";
import { requireViewer } from "@/lib/server/dal";
import { closeStaleRuns } from "@/lib/server/searches";
import { activitySince, activitySummary } from "@/lib/server/activity";
import { dashboardData, PERIODS, type Period } from "@/lib/server/dashboard";
import { formatNumber } from "@/lib/domain/pricing";

export const metadata: Metadata = { title: "Panoramica" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const viewer = await requireViewer();
  const { periodo } = await searchParams;
  const period = (PERIODS.find((p) => String(p) === periodo) ?? 30) as Period;
  await closeStaleRuns(viewer.org.id);
  const since = await activitySince(viewer.user.id);
  const [activity, d] = await Promise.all([activitySummary(since), dashboardData(period)]);
  const firstName = viewer.fullName.split(" ")[0];
  const quota = d.totalLeads ? Math.round((d.personalLeads / d.totalLeads) * 100) : null;

  return (
    <>
      <PageHeader
        eyebrow={viewer.org.name}
        title={firstName ? `Ciao ${firstName} 👋` : "Panoramica"}
        description="Le tue ricerche, i lead consegnati e i crediti a disposizione."
        actions={
          <ButtonLink href="/app/ricerche/nuova">
            <span className="text-lg leading-none">+</span> Nuova ricerca
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="coins" label="Crediti usati nel mese" value={formatNumber(d.monthCredits)} hint={`${formatNumber(viewer.credits)} ancora disponibili`} href="/app/crediti" />
        <StatCard icon="users" label="Lead consegnati" value={formatNumber(d.totalLeads)} hint={d.monthLeads ? `+${formatNumber(d.monthLeads)} questo mese` : "Nessuno questo mese"} tone="ledger" href="/app/lead" />
        <StatCard
          icon="clock"
          label="Ricerche in corso"
          value={d.activeSearches}
          tone={d.activeSearches ? "stamp" : "ink"}
          hint={d.activeSearches ? `${formatNumber(d.reserved)} crediti riservati` : "Nessuna ricerca attiva"}
        />
        <StatCard icon="target" label="Quota nominative" value={quota === null ? "—" : `${quota}%`} hint={`${formatNumber(d.personalLeads)} email nominative sul totale`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <LeadsChart days={d.days} period={period} />
        <ActivityCard since={since} summary={activity.summary} items={activity.items} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PipelineCard pipeline={d.pipeline} />
        <ToolsCard />
      </div>

      <div className="mb-4 mt-12 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">Ultime ricerche</h2>
        {d.searches.length > 0 && <ButtonLink href="/app/ricerche" variant="secondary" size="sm">Vedi tutte le ricerche →</ButtonLink>}
      </div>
      {d.searches.length ? (
        <SearchTable searches={d.searches as SearchListItem[]} />
      ) : (
        <EmptyState title="Nessuna ricerca, per ora" action={<ButtonLink href="/app/ricerche/nuova">Avvia la prima ricerca</ButtonLink>}>
          Descrivi i clienti che cerchi: settore, paese, ruoli. Con i crediti gratuiti puoi ricevere i primi lead in pochi minuti.
        </EmptyState>
      )}
    </>
  );
}
