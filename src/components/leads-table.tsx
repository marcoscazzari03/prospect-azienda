"use client";
import { Fragment, useActionState, useState, useTransition } from "react";
import { reportLead, type ActionState } from "@/app/app/actions";
import { saveLeadNotes, setLeadStage, setListMembership, type LeadActionState } from "@/app/app/lead/actions";
import { LEAD_STAGES, LEAD_STAGE_LABEL, ROLE_MATCH_LABEL, type DeliveryRow, type LeadStage } from "@/lib/domain/leads";
import { OPPORTUNITY_RULES, opportunityScore, signalByCode, signalPhrase } from "@/lib/domain/signals";
import { MAILBOX_LABEL, type MailboxCheck } from "@/lib/domain/mailbox";
import { Alert, Badge, Button, ProvenanceStamp, Select, cx } from "./ui";
import { safeHttpUrl } from "@/lib/domain/safe-url";

function ReportForm({ deliveryId, hasSignals, hasPerson, hasEmail }: { deliveryId: string; hasSignals: boolean; hasPerson: boolean; hasEmail: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reportLead, {});
  if (state.info) return <Alert tone="ledger">{state.info}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <Select name="reason" className="sm:w-64" defaultValue={hasEmail ? "bounce" : "company_closed"} aria-label="Motivo">
        {hasEmail && <option value="bounce">L&apos;email rimbalza</option>}
        {hasPerson && <option value="wrong_role">Ruolo sbagliato</option>}
        <option value="company_closed">Azienda chiusa o inesistente</option>
        <option value="out_of_target">Fuori dai filtri della ricerca</option>
        <option value="duplicate">Duplicato</option>
        {hasSignals && <option value="wrong_signal">Segnale non corretto</option>}
        <option value="other">Altro</option>
      </Select>
      <input name="note" placeholder="Nota (facoltativa)" maxLength={500} className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm" />
      <Button type="submit" variant="secondary" size="md" disabled={pending}>Segnala</Button>
      {state.error && <p className="text-xs text-brick">{state.error}</p>}
    </form>
  );
}

const host = (u?: string) => {
  try {
    return u ? new URL(u).host.replace(/^www\./, "") + new URL(u).pathname.replace(/\/$/, "") : "";
  } catch {
    return u ?? "";
  }
};

export type LeadList = { id: string; name: string };

// Icona del sito (dal nostro /api/favicon); se non c'è, non si mostra niente.
function SiteIcon({ domain }: { domain: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- icona 16px servita già in cache dalla nostra API
    <img src={`/api/favicon?d=${encodeURIComponent(domain)}`} alt="" width={16} height={16} loading="lazy" className="h-4 w-4 shrink-0 rounded-sm" onError={() => setHidden(true)} />
  );
}

function StageSelect({ id, initial }: { id: string; initial: LeadStage }) {
  const [stage, setStage] = useState<LeadStage>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <Select
      value={stage}
      disabled={pending}
      aria-label="Fase commerciale"
      className={cx("h-8 w-40 py-0 text-xs", error && "border-brick", stage === "won" && "text-ledger", stage === "lost" && "text-muted")}
      onChange={(e) => {
        const next = e.target.value as LeadStage;
        const prev = stage;
        setStage(next);
        start(async () => {
          const res = await setLeadStage(id, next);
          setError(Boolean(res.error));
          if (res.error) setStage(prev);
        });
      }}
    >
      {LEAD_STAGES.map((s) => <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>)}
    </Select>
  );
}

function NotesForm({ id, initial }: { id: string; initial: string }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(saveLeadNotes, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="deliveryId" value={id} />
      <textarea name="notes" defaultValue={initial} maxLength={2000} rows={3} placeholder="Es. chiamato il 12/10, richiamare a novembre" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>Salva nota</Button>
        {state.info && <span className="text-xs text-ledger">{state.info}</span>}
        {state.error && <span className="text-xs text-brick">{state.error}</span>}
      </div>
    </form>
  );
}

function ListPicker({ ids, lists, onDone, label = "Aggiungi" }: { ids: string[]; lists: LeadList[]; onDone?: () => void; label?: string }) {
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<LeadActionState>({});
  if (!lists.length) return <p className="text-xs text-muted">Crea una lista in alto per organizzare i lead.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={listId} onChange={(e) => setListId(e.target.value)} className="h-8 w-48 py-0 text-xs" aria-label="Lista">
        {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </Select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || !ids.length || !listId}
        onClick={() => start(async () => {
          const res = await setListMembership(listId, ids, true);
          setMsg(res);
          if (!res.error) onDone?.();
        })}
      >
        {label}
      </Button>
      {msg.info && <span className="text-xs text-ledger">{msg.info}</span>}
      {msg.error && <span className="text-xs text-brick">{msg.error}</span>}
    </div>
  );
}

function ListChips({ id, memberOf, lists }: { id: string; memberOf: string[]; lists: LeadList[] }) {
  const [pending, start] = useTransition();
  const names = lists.filter((l) => memberOf.includes(l.id));
  if (!names.length) return <p className="text-muted">In nessuna lista</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((l) => (
        <Badge key={l.id}>
          {l.name}
          <button type="button" disabled={pending} onClick={() => start(async () => void (await setListMembership(l.id, [id], false)))} className="ml-1 opacity-60 hover:opacity-100" aria-label={`Togli da ${l.name}`}>×</button>
        </Badge>
      ))}
    </div>
  );
}

// `offers`: servizio scelto in ogni ricerca (search_id -> codice), per il punteggio dell'opportunità.
export function LeadsTable({ rows, lists, offers = {} }: { rows: DeliveryRow[]; lists?: LeadList[]; offers?: Record<string, string | undefined> }) {
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const manage = Boolean(lists);
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  // Colonna del referente solo se qualche lead ce l'ha (in «Solo azienda» non c'è mai).
  const withPeople = rows.some((r) => Boolean(r.data.person?.full_name));
  // Colonna del punteggio solo se qualche lead ha un'opportunità (la «qualità» del contatto era
  // uguale per tutti in «Solo azienda» e non diceva niente).
  const withOpportunity = rows.some((r) => Boolean(r.data.signals?.length));
  const cols = (manage ? 7 : 5) - (withPeople ? 0 : 1) - (withOpportunity ? 0 : 1);
  return (
    <>
    {manage && selected.size > 0 && (
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm">
        <span className="font-medium">{selected.size} selezionati</span>
        <ListPicker ids={[...selected]} lists={lists ?? []} label="Aggiungi alla lista" onDone={() => setSelected(new Set())} />
        <button type="button" className="text-xs text-ink-2 underline" onClick={() => setSelected(new Set())}>Annulla selezione</button>
      </div>
    )}
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className={cx("w-full text-left text-sm", manage ? "min-w-[1040px]" : "min-w-[860px]")}>
        <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            {manage && (
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Seleziona tutti" />
              </th>
            )}
            {withPeople && <th className="px-4 py-3 font-medium">Referente</th>}
            <th className="px-4 py-3 font-medium">Azienda</th>
            <th className="px-4 py-3 font-medium">Contatto</th>
            {withOpportunity && <th className="px-4 py-3 text-right font-medium">Opportunità</th>}
            {manage && <th className="px-4 py-3 font-medium">Stato</th>}
            <th className="w-10 px-2 py-3"><span className="sr-only">Dettagli</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const d = r.data;
            const isOpen = open === r.id;
            const opp = opportunityScore(d.signals, offers[r.search_id]);
            return (
              <Fragment key={r.id}>
                <tr className={cx("animate-row-in border-t border-line align-top", isOpen && "bg-paper/70")} style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
                  {manage && (
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Seleziona ${d.person?.full_name || d.company?.name || ""}`} />
                    </td>
                  )}
                  {withPeople && (
                    <td className="px-4 py-3">
                      {d.person?.full_name ? <p className="font-medium">{d.person.full_name}</p> : <p className="text-ink-2">Non indicato</p>}
                      <p className="text-xs text-ink-2">{d.person?.job_title || "—"}</p>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <a href={safeHttpUrl(d.company?.website)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 font-medium hover:text-ledger">
                      {d.company?.domain && <SiteIcon domain={d.company.domain} />}
                      {d.company?.name}
                    </a>
                    <p className="text-xs text-ink-2">{[d.company?.industry, d.company?.city, d.company?.country].filter(Boolean).join(" · ")}</p>
                    {!!d.signals?.length && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.signals.map((sg) => <Badge key={sg.code} tone="stamp">{signalByCode(sg.code)?.label ?? sg.code}</Badge>)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.email_type === "form" ? (
                      <>
                        <a href={safeHttpUrl(d.company?.contact_form)} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-ledger underline">Modulo di contatto →</a>
                        <p className="mt-1 text-xs text-ink-2">Nessuna email pubblica sul sito</p>
                      </>
                    ) : (
                      <>
                        <p className="font-mono text-[13px]">{r.email_address}</p>
                        <div className="mt-1"><ProvenanceStamp status={r.email_status} type={r.email_type} href={safeHttpUrl(d.email?.source_url)} /></div>
                        {safeHttpUrl(d.company?.contact_form) && (
                          <a href={safeHttpUrl(d.company?.contact_form)} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block text-xs text-ledger underline">anche modulo di contatto</a>
                        )}
                      </>
                    )}
                  </td>
                  {withOpportunity && (
                    <td className="px-4 py-3 text-right">
                      {opp ? <><span className="font-mono">{opp.score}</span><p className="text-xs text-ink-2">{opp.level}</p></> : <span className="text-muted">—</span>}
                    </td>
                  )}
                  {manage && (
                    <td className="px-4 py-3">
                      <StageSelect id={r.id} initial={r.stage ?? "new"} />
                    </td>
                  )}
                  <td className="px-2 py-3">
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="rounded-md px-2 py-1 font-mono text-ledger hover:bg-paper-2" aria-label="Dettagli">
                      {isOpen ? "−" : "+"}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-paper/70">
                    <td colSpan={cols} className="px-4 pb-5">
                      {!!d.signals?.length && (
                        <div className="mb-4 rounded-lg border border-stamp/30 bg-stamp-soft/60 px-4 py-3 text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-stamp-ink">Perché è in target</p>
                          <ul className="flex flex-col gap-1">
                            {d.signals.map((sg) => (
                              <li key={sg.code}>
                                <span className="font-medium">{signalByCode(sg.code)?.label ?? sg.code}:</span> {signalPhrase(sg)}
                                {safeHttpUrl(sg.evidence?.url) && (
                                  <> · <a className="text-ledger underline" href={safeHttpUrl(sg.evidence?.url)} target="_blank" rel="noopener noreferrer nofollow">vedi la prova</a></>
                                )}
                              </li>
                            ))}
                          </ul>
                          {opp && (
                            <p className="mt-2">
                              <span className="font-medium">Opportunità {opp.level} ({opp.score}/100):</span>{" "}
                              {opp.parts.map((p) => `${signalByCode(p.code)?.label ?? p.code}: affidabilità ${p.reliability}, attinenza al servizio ${Math.round(p.relevance * 100)}%, prova ${p.ageDays === null ? "senza data" : p.ageDays === 0 ? "di oggi" : `di ${p.ageDays} giorni fa`}`).join(" · ")}
                              {opp.parts.length > 1 ? ` · +${OPPORTUNITY_RULES.extraSignalBonus} per ogni segnale in più` : ""}.
                            </p>
                          )}
                          <p className="mt-2 text-muted">I segnali sono fatti pubblici osservati alla data indicata; l&apos;opportunità è una nostra stima e non garantisce che l&apos;azienda abbia bisogno di un servizio.</p>
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-muted">Fonti</p>
                          {safeHttpUrl(d.sources?.discovery_url) && <p>Azienda: <a className="text-ledger underline" href={safeHttpUrl(d.sources?.discovery_url)} target="_blank" rel="noopener noreferrer nofollow">{host(d.sources?.discovery_url ?? "")}</a></p>}
                          {d.email?.source === "enrichment" ? <p>Email: verificata tecnicamente</p> : safeHttpUrl(d.email?.source_url) && <p>Email: <a className="text-ledger underline" href={safeHttpUrl(d.email?.source_url)} target="_blank" rel="noopener noreferrer nofollow">{host(d.email?.source_url ?? "")}</a></p>}
                          {safeHttpUrl(d.person?.linkedin_url) && <p>LinkedIn: <a className="text-ledger underline" href={safeHttpUrl(d.person?.linkedin_url)} target="_blank" rel="noopener noreferrer nofollow">profilo</a></p>}
                          {typeof d.quality?.checks?.mailbox === "string" && MAILBOX_LABEL[d.quality.checks.mailbox as MailboxCheck] && (
                            <p className="mt-2">{MAILBOX_LABEL[d.quality.checks.mailbox as MailboxCheck]}</p>
                          )}
                          {d.person?.full_name && <p className="mt-2">{ROLE_MATCH_LABEL[d.person?.role_match ?? ""] ?? ""}</p>}
                        </div>
                        <div className="text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-muted">{r.email_type === "form" ? "Modulo di contatto" : "Altre email trovate"}</p>
                          {r.email_type === "form" && safeHttpUrl(d.company?.contact_form) && (
                            <p className="mb-1">Pagina: <a className="text-ledger underline" href={safeHttpUrl(d.company?.contact_form)} target="_blank" rel="noopener noreferrer nofollow">{host(d.company?.contact_form ?? "")}</a>. Compila il modulo a mano, con un messaggio personalizzato.</p>
                          )}
                          {r.email_type === "form" ? null : d.email?.alternatives?.length ? d.email.alternatives.map((a) => <p key={a.address} className="font-mono">{a.address}</p>) : <p className="text-muted">Nessuna</p>}
                          {!!d.email_patterns?.length && (
                            <div className="mt-2">
                              <Badge tone="brick">Ipotizzate, non verificate</Badge>
                              {d.email_patterns.map((p) => <p key={p.address} className="font-mono text-muted">{p.address}</p>)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-muted">Costo</p>
                          <p><span className="font-mono">{r.credits}</span> crediti · consegnato il {new Date(r.delivered_at).toLocaleDateString("it-IT")}</p>
                          {d.origin?.source === "warehouse" && (
                            <p className="mt-1 text-muted">
                              Consegnato subito dal nostro archivio{d.origin.verified_at ? ` · dati verificati il ${new Date(d.origin.verified_at).toLocaleDateString("it-IT")}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      {manage && (
                        <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                          <div className="text-xs">
                            <p className="mb-2 font-medium uppercase tracking-wider text-muted">Note</p>
                            <NotesForm id={r.id} initial={r.notes ?? ""} />
                          </div>
                          <div className="text-xs">
                            <p className="mb-2 font-medium uppercase tracking-wider text-muted">Liste</p>
                            <ListChips id={r.id} memberOf={(r.lead_list_items ?? []).map((x) => x.list_id)} lists={lists ?? []} />
                            <div className="mt-2"><ListPicker ids={[r.id]} lists={lists ?? []} /></div>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 border-t border-line pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Qualcosa non va?</p>
                        <ReportForm deliveryId={r.id} hasSignals={Boolean(r.data?.signals?.length)} hasPerson={Boolean(r.data?.person?.full_name)} hasEmail={r.email_type !== "form"} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
