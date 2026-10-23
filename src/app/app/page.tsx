import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { ActivityCard, LeadsChart, PipelineCard, StatCard, ToolsCard } from "@/components/dashboard";
import { requireViewer } from "@/lib/server/dal";
import { closeStaleRuns } from "@/lib/server/searches";
import { activitySince, activitySummary } from "@/lib/server/activity";
import { dashboardData, PERIODS, type Period } from "@/lib/server/dashboard";
import { formatNumber } from "@/lib/domain/pricing";
import { BRAND } from "@/lib/config";
import { SuggestedSearches } from "@/components/suggested-searches";
import { suggestionsVisible } from "@/lib/server/suggestions";
import { getEnabledOffers } from "@/lib/server/offer-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBusinessExample, type StoredSuggestions } from "@/lib/domain/suggestions";

export const metadata: Metadata = { title: "Panoramica" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const viewer = await requireViewer();
  const { periodo, attivita } = await searchParams;
  const period = (PERIODS.find((p) => String(p) === periodo) ?? 30) as Period;
  await closeStaleRuns(viewer.org.id);
  const since = await activitySince(viewer.user.id);
  const [activity, d, suggest] = await Promise.all([activitySummary(since), dashboardData(period), suggestionsVisible(viewer)]);
  // Ricerche consigliate (punti 84–85): solo se l'interruttore dell'Admin le mostra a questo utente.
  const business = suggest
    ? (await createAdminClient().from("organizations").select("business_description, business_area, business_suggestions, business_skipped_at").eq("id", viewer.org.id).maybeSingle()).data
    : null;
  // Scelte rapide del riquadro (grafica Avvisto, 23/10): i servizi attivi del catalogo, prima quelli più richiesti.
  const QUICK = ["web_redesign", "wp_maintenance", "cybersecurity", "digital_marketing", "site_security"];
  const services = business
    ? (await getEnabledOffers()).filter((o) => QUICK.includes(o.code)).sort((a, b) => QUICK.indexOf(a.code) - QUICK.indexOf(b.code)).map((o) => ({ code: o.code, label: o.label }))
    : [];
  const firstName = viewer.fullName.split(" ")[0];
  const quota = d.totalLeads ? Math.round((d.signalLeads / d.totalLeads) * 100) : null;

  return (
    <>
      <PageHeader
        eyebrow={`Benvenuto su ${BRAND.short}${BRAND.suffix}`}
        title={firstName ? `Ciao ${firstName} 👋` : "Panoramica"}
        description="Trova aziende con reali opportunità per far crescere il tuo business."
        actions={
          <>
            <ButtonLink href="/app/ricerche/nuova?tipo=opportunita" variant="secondary" size="none" className="h-[42px] rounded-[10px] px-4 text-[13px]">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.5-3.5" /></svg>
              Trova aziende con opportunità
            </ButtonLink>
            <ButtonLink href="/app/ricerche/nuova" size="none" className="h-[46px] px-5 text-[17px] font-semibold">
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M10 4v12M4 10h12" /></svg>
              Nuova ricerca
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
          startEditing={attivita === "modifica"}
          services={services}
        />
      )}

      {/* Statistiche (bozza del 23/10): variazione sugli stessi giorni del mese scorso e grafico degli ultimi 30 giorni. */}
      <div className="grid gap-5 sm:grid-cols-2 min-[1500px]:grid-cols-4">
        <StatCard icon="coins" tone="ok" label="Crediti usati nel mese" value={formatNumber(d.monthCredits)} delta={d.stats.credits.delta} series={d.stats.credits.series} hint={d.stats.credits.delta ? "rispetto al mese scorso" : `${formatNumber(viewer.credits)} ancora disponibili`} href="/app/crediti" />
        <StatCard icon="users" tone="ledger" label="Lead consegnati" value={formatNumber(d.totalLeads)} delta={d.stats.leads.delta} series={d.stats.leads.series} hint={`di cui ${formatNumber(d.signalLeads)} con opportunità`} href="/app/lead" />
        <StatCard
          icon="clock"
          tone="orange"
          label="Ricerche in corso"
          value={d.activeSearches}
          hint={d.activeSearches ? `${formatNumber(d.reserved)} crediti riservati` : "Nessuna ricerca attiva"}
          href="/app/ricerche"
        />
        <StatCard icon="target" tone="sky" label="Con opportunità" value={quota === null ? "—" : `${quota}%`} delta={d.stats.signals.delta} hint="dei lead consegnati" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <LeadsChart days={d.days} period={period} />
        <ActivityCard since={since} summary={activity.summary} items={activity.items} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
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
