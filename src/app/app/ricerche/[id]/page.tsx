import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { ContactNotice } from "@/components/contact-notice";
import { LeadsTable } from "@/components/leads-table";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Progress, SearchStatus, cx } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { closeStaleRuns } from "@/lib/server/searches";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";
import type { DeliveryRow } from "@/lib/domain/leads";
import { REPEAT_LABEL, withoutSynonyms, type Repeat, type SearchTarget } from "@/lib/domain/search-input";
import { describeOffer, describeOpportunity, offerByCode, signalByCode } from "@/lib/domain/signals";
import { archiveSearch, deleteSearch, stopRepeat, toggleAlert } from "../../actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ActionMenu } from "@/components/action-menu";
import { menuItem } from "@/components/menu-item";

export const metadata: Metadata = { title: "Ricerca" };

export default async function SearchDetailPage({ params, searchParams }: PageProps<"/app/ricerche/[id]">) {
  const { id } = await params;
  const alertError = (await searchParams).avviso === "errore";
  const viewer = await requireViewer();
  await closeStaleRuns(viewer.org.id);
  const supabase = await createClient();
  const [{ data: search }, { data: events }, { data: leads }, { data: lists }, { data: alert }] = await Promise.all([
    supabase.from("searches").select("*").eq("id", id).maybeSingle(),
    supabase.from("search_events").select("id, stage, message, created_at").eq("search_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("deliveries").select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at, stage, notes, archived_at, lead_list_items(list_id)").eq("search_id", id).is("deleted_at", null).order("quality_score", { ascending: false }),
    supabase.from("lead_lists").select("id, name").order("name"),
    supabase.from("search_alerts").select("next_run_at, user_id").eq("search_id", id).maybeSingle(),
  ]);
  if (!search || search.deleted_at) notFound();

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
            {!!t.signals?.codes.length && <Badge tone="stamp">Opportunità</Badge>}
            {t.contact === "email_or_form" && <Badge>Email o modulo di contatto</Badge>}
            {search.archived_at && <Badge tone="neutral">Archiviata</Badge>}
            <span className="text-sm text-muted">avviata il {new Date(search.created_at).toLocaleString("it-IT")}</span>
            {search.repeat_of && (
              <Link href={`/app/ricerche/${search.repeat_of}`} className="text-sm text-ledger underline">ripetizione automatica</Link>
            )}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/app/ricerche/nuova?da=${id}`} variant={running ? "secondary" : "primary"}>Ripeti con nuovi lead</ButtonLink>
            {!!leads?.length && (
              <ActionMenu label="Esporta">
                <a href={`/api/export?format=xlsx&search=${id}`} className={menuItem}>
                  <span className="font-medium">Excel</span>
                  <span className="text-xs text-muted">Con filtri e il foglio «Come usarli»</span>
                </a>
                <a href={`/api/export?search=${id}`} className={menuItem}>
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-muted">Per importarli nel tuo CRM</span>
                </a>
              </ActionMenu>
            )}
            {!running && (
              <ActionMenu label="Altro">
                <form action={archiveSearch}>
                  <input type="hidden" name="searchId" value={search.id} />
                  <input type="hidden" name="archive" value={search.archived_at ? "0" : "1"} />
                  <button type="submit" className={menuItem}>
                    <span className="font-medium">{search.archived_at ? "Ripristina la ricerca" : "Archivia la ricerca"}</span>
                    <span className="text-xs text-muted">{search.archived_at ? "Torna tra le ricerche, con i suoi lead" : "La nasconde con i suoi lead; si può ripristinare"}</span>
                  </button>
                </form>
                <form action={deleteSearch} className="mt-1 border-t border-line pt-1">
                  <input type="hidden" name="searchId" value={search.id} />
                  <ConfirmSubmit
                    className={cx(menuItem, "text-brick")}
                    message={`Eliminare la ricerca «${search.name}» e i suoi ${leads?.length ?? 0} lead? I dati vengono cancellati per sempre; le aziende non ti verranno riproposte e i crediti usati non tornano.`}
                  >
                    <span className="font-medium">Elimina la ricerca</span>
                    <span className="text-xs text-brick/70">Cancella per sempre i suoi lead</span>
                  </ConfirmSubmit>
                </form>
              </ActionMenu>
            )}
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

      {/* Avviso settimanale gratuito (migrazione 056): durante la beta solo per gli amministratori. */}
      {viewer.isAdmin && !!t.signals?.codes.length && !search.archived_at && (
        search.repeat !== "none" ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>Questa ricerca si ripete già da sola: l&apos;avviso settimanale non serve.</p>
            {alert && (
              <form action={toggleAlert}>
                <input type="hidden" name="searchId" value={search.id} />
                <input type="hidden" name="on" value="0" />
                <Button type="submit" size="sm" variant="secondary">Disattiva l&apos;avviso</Button>
              </form>
            )}
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-5 py-4 text-sm">
            {alertError && !alert && (
              <p className="w-full text-brick">L&apos;avviso non si è attivato. Riprova tra qualche minuto; se succede ancora, scrivici.</p>
            )}
            {alert ? (
              <p>
                <Badge tone="ledger">Avviso attivo</Badge>{" "}
                Prossimo avviso <span className="font-mono">{new Date(alert.next_run_at).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Europe/Rome" })}</span>{alert.user_id === viewer.user.id && <> a {viewer.email}</>}, se ci sono almeno 3 aziende nuove.
              </p>
            ) : (
              <p>
                <span className="font-medium">Avviso settimanale (gratis)</span>
                <span className="block text-ink-2">Ogni lunedì ti scriviamo quante aziende nuove hanno un&apos;opportunità per questa ricerca. Non spendi crediti: decidi tu se riceverle.</span>
              </p>
            )}
            <form action={toggleAlert}>
              <input type="hidden" name="searchId" value={search.id} />
              <input type="hidden" name="on" value={alert ? "0" : "1"} />
              <Button type="submit" size="sm" variant="secondary">{alert ? "Disattiva l'avviso" : "Avvisami ogni settimana"}</Button>
            </form>
          </div>
        )
      )}

      {!!t.signals?.codes.length && (
        <div className="mb-6 rounded-xl border border-ledger/30 bg-ledger-soft/60 px-5 py-4 text-sm">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ledger">Ricerca opportunità</p>
          <p className="text-ink-2">
            {t.signals.offer && offerByCode(t.signals.offer) && <span className="mb-1 block font-medium text-ink">{offerByCode(t.signals.offer)!.label}</span>}
            {t.signals.offer ? describeOffer({ offer: t.signals.offer, lookFor: t.signals.look_for, industry: t.industry, where: t.regions?.join(", ") || t.country_names?.join(", ") || "" }) : describeOpportunity({
              codes: t.signals.codes,
              match: t.signals.match,
              jobFamilies: t.signals.job_families.map((f) => f.code),
              industry: t.industry,
              where: t.regions?.join(", ") || t.country_names?.join(", ") || "",
            })}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted">Lead consegnati</p>
              <p className="font-mono text-4xl font-semibold">{search.delivered}<span className="text-xl text-muted">/{search.quantity}</span></p>
            </div>
            {search.email_mode !== "company_only" && <p className="text-sm text-muted">{personal} nominative · {search.delivered - personal} generiche</p>}
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
          <dt className="text-muted">Settore</dt><dd>{t.industry || (t.industry_keywords?.length ? withoutSynonyms(t.industry_keywords).join(", ") : "Tutti i settori")}</dd>
          <dt className="text-muted">Paesi</dt><dd>{t.country_names?.join(", ")}</dd>
          {!!t.regions?.length && (<><dt className="text-muted">Aree</dt><dd>{t.regions.join(", ")}</dd></>)}
          {!!t.company_size?.length && (<><dt className="text-muted">Dimensione</dt><dd>{t.company_size.join(", ")}</dd></>)}
          {!!t.roles?.length && (<><dt className="text-muted">Ruoli</dt><dd>{t.roles.join(", ")}</dd></>)}
          {!!t.keywords?.length && (<><dt className="text-muted">Parole chiave</dt><dd>{t.keywords.join(", ")}</dd></>)}
          {!!t.exclude_keywords?.length && (<><dt className="text-muted">Escluse</dt><dd>{t.exclude_keywords.join(", ")}</dd></>)}
          {t.signals?.offer && offerByCode(t.signals.offer) && (<><dt className="text-muted">Servizio</dt><dd>{offerByCode(t.signals.offer)!.label}</dd></>)}
          {!!t.signals?.codes.length && (
            <>
              <dt className="text-muted">Segnali</dt>
              <dd>
                {t.signals.codes.map((c) => signalByCode(c)?.label ?? c).join(", ")}
                {t.signals.job_families.length > 0 && ` (${t.signals.job_families.map((f) => f.label).join(", ")})`}
                {t.signals.codes.length > 1 && ` · ${t.signals.match === "all" ? "servono tutti" : "basta uno"}`}
              </dd>
            </>
          )}
        </dl>
      </details>

      <h2 className="mb-4 mt-10 font-display text-2xl font-semibold">Lead</h2>
      {leads?.length ? (
        <>
          <ContactNotice />
          <LeadsTable rows={leads as DeliveryRow[]} lists={lists ?? []} offers={{ [search.id]: t.signals?.offer }} archived={Boolean(search.archived_at)} />
        </>
      ) : (
        <EmptyState title={running ? "Stiamo cercando…" : "Nessun lead in questa ricerca"}>
          {running
            ? "Pianifichiamo la ricerca, visitiamo i siti ufficiali e controlliamo i dati delle aziende. Di solito servono 5-20 minuti: puoi chiudere la pagina, ti avvisiamo via email."
            : t.signals?.codes.length
              ? "Nessuna azienda con la prova del segnale richiesto. Prova ad allargare l'area, a scegliere «basta un segnale» o ad aggiungere un altro segnale."
              : "Prova ad allargare l'area geografica, a togliere qualche filtro o a scegliere un settore più ampio."}
        </EmptyState>
      )}
    </>
  );
}
