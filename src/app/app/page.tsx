import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { ActivityCard, LeadsChart, PipelineCard, StatCard, ToolsCard } from "@/components/dashboard";
import { requireViewer } from "@/lib/server/dal";
import { closeStaleRuns } from "@/lib/server/searches";
import { activitySince, activitySummary } from "@/lib/server/activity";
import { dashboardData, PERIODS, type Period } from "@/lib/server/dashboard";
import { formatNumber } from "@/lib/domain/pricing";
import { SuggestedSearches } from "@/components/suggested-searches";
import { suggestionsVisible } from "@/lib/server/suggestions";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBusinessExample, type StoredSuggestions } from "@/lib/domain/suggestions";

export const metadata: Metadata = { title: "Panoramica" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const viewer = await requireViewer();
  const { periodo } = await searchParams;
  const period = (PERIODS.find((p) => String(p) === periodo) ?? 30) as Period;
  await closeStaleRuns(viewer.org.id);
  const since = await activitySince(viewer.user.id);
  const [activity, d, suggest] = await Promise.all([activitySummary(since), dashboardData(period), suggestionsVisible(viewer)]);
  // Ricerche consigliate (punti 84–85): solo se l'interruttore dell'Admin le mostra a questo utente.
  const business = suggest
    ? (await createAdminClient().from("organizations").select("business_description, business_area, business_suggestions, business_skipped_at").eq("id", viewer.org.id).maybeSingle()).data
    : null;
  const firstName = viewer.fullName.split(" ")[0];
  const quota = d.totalLeads ? Math.round((d.signalLeads / d.totalLeads) * 100) : null;

  return (
    <>
      <PageHeader
        eyebrow={viewer.org.name}
        title={firstName ? `Ciao ${firstName} 👋` : "Panoramica"}
        description="Le tue ricerche, i lead consegnati e i crediti a disposizione."
        actions={
          <>
            <ButtonLink href="/app/ricerche/nuova?tipo=opportunita" variant="secondary">Trova aziende con opportunità</ButtonLink>
            <ButtonLink href="/app/ricerche/nuova">
              <span className="text-lg leading-none">+</span> Nuova ricerca
            </ButtonLink>
          </>
        }
      />

      {business && (
        <SuggestedSearches
          description={business.business_description}
          area={business.business_area}
          stored={business.business_suggestions as StoredSuggestions | null}
          skipped={Boolean(business.business_skipped_at)}
          // Scelto qui sul server, così browser e server mostrano la stessa frase.
          example={randomBusinessExample()}
        />
      )}

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
        <StatCard icon="target" label="Con opportunità" value={quota === null ? "—" : `${quota}%`} hint={`${formatNumber(d.signalLeads)} lead con un segnale verificato`} />
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
          Descrivi i clienti che cerchi (settore e zona) o scegli il servizio che vendi. Con i crediti gratuiti ricevi le prime aziende in pochi minuti.
        </EmptyState>
      )}
    </>
  );
}
