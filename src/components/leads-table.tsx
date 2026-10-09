"use client";
import { Fragment, useActionState, useState } from "react";
import { reportLead, type ActionState } from "@/app/app/actions";
import { ROLE_MATCH_LABEL, type DeliveryRow } from "@/lib/domain/leads";
import { Alert, Badge, Button, ProvenanceStamp, Select, cx } from "./ui";

function ReportForm({ deliveryId }: { deliveryId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reportLead, {});
  if (state.info) return <Alert tone="ledger">{state.info}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <Select name="reason" className="sm:w-64" defaultValue="bounce" aria-label="Motivo">
        <option value="bounce">L&apos;email rimbalza</option>
        <option value="wrong_role">Ruolo sbagliato</option>
        <option value="company_closed">Azienda chiusa o inesistente</option>
        <option value="out_of_target">Fuori dai filtri della ricerca</option>
        <option value="duplicate">Duplicato</option>
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

export function LeadsTable({ rows }: { rows: DeliveryRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Contatto</th>
            <th className="px-4 py-3 font-medium">Azienda</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 text-right font-medium">Qualità</th>
            <th className="w-10 px-2 py-3"><span className="sr-only">Dettagli</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const d = r.data;
            const isOpen = open === r.id;
            return (
              <Fragment key={r.id}>
                <tr className={cx("animate-row-in border-t border-line align-top", isOpen && "bg-paper/70")} style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.person?.full_name}</p>
                    <p className="text-xs text-ink-2">{d.person?.job_title || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href={d.company?.website} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:text-ledger">{d.company?.name}</a>
                    <p className="text-xs text-ink-2">{[d.company?.city, d.company?.country].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[13px]">{r.email_address}</p>
                    <div className="mt-1"><ProvenanceStamp status={r.email_status} type={r.email_type} href={d.email?.source_url || undefined} /></div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.quality_score}</td>
                  <td className="px-2 py-3">
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="rounded-md px-2 py-1 font-mono text-ledger hover:bg-paper-2" aria-label="Dettagli">
                      {isOpen ? "−" : "+"}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-paper/70">
                    <td colSpan={5} className="px-4 pb-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-muted">Fonti</p>
                          {d.sources?.discovery_url && <p>Contatto: <a className="text-ledger underline" href={d.sources.discovery_url} target="_blank" rel="noopener noreferrer nofollow">{host(d.sources.discovery_url)}</a></p>}
                          {d.email?.source === "enrichment" ? <p>Email: verificata tecnicamente</p> : d.email?.source_url && <p>Email: <a className="text-ledger underline" href={d.email.source_url} target="_blank" rel="noopener noreferrer nofollow">{host(d.email.source_url)}</a></p>}
                          {d.person?.linkedin_url && <p>LinkedIn: <a className="text-ledger underline" href={d.person.linkedin_url} target="_blank" rel="noopener noreferrer nofollow">profilo</a></p>}
                          <p className="mt-2">{ROLE_MATCH_LABEL[d.person?.role_match ?? ""] ?? ""}</p>
                        </div>
                        <div className="text-xs">
                          <p className="mb-1 font-medium uppercase tracking-wider text-muted">Altre email trovate</p>
                          {d.email?.alternatives?.length ? d.email.alternatives.map((a) => <p key={a.address} className="font-mono">{a.address}</p>) : <p className="text-muted">Nessuna</p>}
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
                        </div>
                      </div>
                      <div className="mt-4 border-t border-line pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Qualcosa non va?</p>
                        <ReportForm deliveryId={r.id} />
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
  );
}
