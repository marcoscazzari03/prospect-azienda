import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { LeadsTable } from "@/components/leads-table";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Progress, SearchStatus } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { closeStaleRuns } from "@/lib/server/searches";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";
import type { DeliveryRow } from "@/lib/domain/leads";
import { REPEAT_LABEL, type Repeat, type SearchTarget } from "@/lib/domain/search-input";
import { stopRepeat } from "../../actions";

export const metadata: Metadata = { title: "Ricerca" };

export default async function SearchDetailPage({ params }: PageProps<"/app/ricerche/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer();
  await closeStaleRuns(viewer.org.id);
  const supabase = await createClient();
  const [{ data: search }, { data: events }, { data: leads }, { data: lists }] = await Promise.all([
    supabase.from("searches").select("*").eq("id", id).maybeSingle(),
    supabase.from("search_events").select("id, stage, message, created_at").eq("search_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("deliveries").select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at, stage, notes, lead_list_items(list_id)").eq("search_id", id).order("quality_score", { ascending: false }),
    supabase.from("lead_lists").select("id, name").order("name"),
  ]);
  if (!search) notFound();

  const t = search.target as SearchTarget;
  const running = ["queued", "running"].includes(search.status);
  const released = running ? 0 : search.credits_reserved - search.credits_charged;
  const personal = (leads ?? []).filter((l) => l.email_type === "personal").length;

  return (
    <>
      <AutoRefresh active={running} />
      <PageHeader
        eyebrow="Ricerca"
        title={search.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <SearchStatus status={search.status} />
            <Badge>{MODE_INFO[search.email_mode as EmailMode]?.label}</Badge>
            <span className="text-sm text-muted">avviata il {new Date(search.created_at).toLocaleString("it-IT")}</span>
            {search.repeat_of && (
              <Link href={`/app/ricerche/${search.repeat_of}`} className="text-sm text-ledger underline">ripetizione automatica</Link>
            )}
          </span>
        }
        actions={
          <>
            {!!leads?.length && <ButtonLink href={`/api/export?format=xlsx&search=${id}`} variant="secondary" prefetch={false}>Esporta Excel</ButtonLink>}
            {!!leads?.length && <ButtonLink href={`/api/export?search=${id}`} variant="ghost" prefetch={false}>CSV</ButtonLink>}
            <ButtonLink href={`/app/ricerche/nuova?da=${id}`} variant={running ? "secondary" : "primary"}>Ripeti con nuovi lead</ButtonLink>
          </>
        }
      />

      {search.repeat !== "none" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-5 py-4 text-sm">
          <p>
            <span className="font-medium">{REPEAT_LABEL[search.repeat as Repeat]}</span> ripetiamo questa ricerca con nuovi lead.
            {search.next_repeat_at && <> Prossima: <span className="font-mono">{new Date(search.next_repeat_at).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}</span>.</>}
          </p>
          <form action={stopRepeat}>
            <input type="hidden" name="searchId" value={search.id} />
            <Button type="submit" size="sm" variant="secondary">Ferma la ripetizione</Button>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted">Lead consegnati</p>
              <p className="font-mono text-4xl font-semibold">{search.delivered}<span className="text-xl text-muted">/{search.quantity}</span></p>
            </div>
            <p className="text-sm text-muted">{personal} nominative · {search.delivered - personal} generiche</p>
          </div>
          <div className="mt-4"><Progress value={search.delivered} max={search.quantity} /></div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
            <div><p className="text-muted">Riservati</p><p className="font-mono text-lg">{search.credits_reserved}</p></div>
            <div><p className="text-muted">Addebitati</p><p className="font-mono text-lg">{search.credits_charged}</p></div>
            <div><p className="text-muted">Restituiti</p><p className="font-mono text-lg text-ledger">{released}</p></div>
          </div>
          {search.status === "partial" && (
            <p className="mt-4 text-sm text-ink-2">Abbiamo trovato meno lead di quelli richiesti che rispettano tutti i filtri: non ti abbiamo consegnato dati non conformi e i crediti non usati sono tornati disponibili.</p>
          )}
          {search.status === "failed" && <p className="mt-4 text-sm text-brick">{search.error ?? "La ricerca non è andata a buon fine."} I crediti riservati sono stati restituiti.</p>}
        </Card>
        <Card className="p-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted">Avanzamento</p>
          <ol className="flex flex-col gap-3">
            {(events ?? []).slice(0, 8).map((e, i) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 && running ? "animate-pulse bg-stamp" : "bg-ledger"}`} />
                <div>
                  <p>{e.message}</p>
                  <p className="text-xs text-muted">{new Date(e.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <details className="mt-4 rounded-xl border border-line bg-card px-6 py-4 text-sm">
        <summary className="cursor-pointer font-medium">Filtri della ricerca</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">Settore</dt><dd>{t.industry}</dd>
          <dt className="text-muted">Paesi</dt><dd>{t.country_names?.join(", ")}</dd>
          {!!t.regions?.length && (<><dt className="text-muted">Aree</dt><dd>{t.regions.join(", ")}</dd></>)}
          {!!t.company_size?.length && (<><dt className="text-muted">Dimensione</dt><dd>{t.company_size.join(", ")}</dd></>)}
          <dt className="text-muted">Ruoli</dt><dd>{t.roles?.join(", ")}</dd>
          {!!t.keywords?.length && (<><dt className="text-muted">Parole chiave</dt><dd>{t.keywords.join(", ")}</dd></>)}
          {!!t.exclude_keywords?.length && (<><dt className="text-muted">Escluse</dt><dd>{t.exclude_keywords.join(", ")}</dd></>)}
        </dl>
      </details>

      <h2 className="mb-4 mt-10 font-display text-2xl font-semibold">Lead</h2>
      {leads?.length ? (
        <LeadsTable rows={leads as DeliveryRow[]} lists={lists ?? []} />
      ) : (
        <EmptyState title={running ? "Stiamo cercando…" : "Nessun lead in questa ricerca"}>
          {running
            ? "Pianifichiamo la ricerca, visitiamo i siti ufficiali e verifichiamo le email. Di solito servono 5-20 minuti: puoi chiudere la pagina, ti avvisiamo via email."
            : "Prova ad allargare l'area geografica, i ruoli o ad accettare anche le email generiche."}
        </EmptyState>
      )}
    </>
  );
}
