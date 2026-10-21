import Link from "next/link";
import { Badge, ButtonLink, Progress, SearchStatus } from "./ui";
import { COUNTRY_NAME, MODE_INFO, type EmailMode } from "@/lib/domain/catalog";
import { SearchRowMenu } from "./search-row-menu";

export type SearchListItem = {
  id: string;
  alert?: boolean;
  name: string;
  status: string;
  email_mode: string;
  quantity: number;
  delivered: number;
  credits_charged: number;
  created_at: string;
  repeat?: string;
  signals?: unknown; // codici dei segnali (target.signals.codes), se ricerca opportunità
  regions?: unknown; // target.regions
  countries?: unknown; // target.countries
};

const MODE_SHORT: Record<string, string> = { company_only: "Solo azienda", generic_ok: "Generiche incluse", mixed: "Mista", personal_only: "Solo nominative" };

export const isOpportunity = (s: SearchListItem) => Array.isArray(s.signals) && s.signals.length > 0;

// Zona della ricerca: le regioni o città scelte, altrimenti i paesi.
export function searchZone(s: SearchListItem) {
  const regions = Array.isArray(s.regions) ? s.regions.map(String).filter(Boolean) : [];
  if (regions.length) return regions.join(", ");
  const countries = Array.isArray(s.countries) ? s.countries.map((c) => COUNTRY_NAME[String(c)] ?? String(c)) : [];
  return countries.join(", ");
}

const day = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export function SearchTable({
  searches,
  href = (id) => `/app/ricerche/${id}`,
  actions = true,
}: {
  searches: SearchListItem[];
  href?: (id: string) => string;
  actions?: boolean; // menu con ripeti / esporta / ferma la ripetizione (solo nell'app del cliente)
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-line bg-card xl:overflow-visible">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Ricerca</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Stato</th>
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 text-right font-medium">Crediti</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3"><span className="sr-only">Azioni</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {searches.map((s) => {
            const zone = searchZone(s);
            return (
              <tr key={s.id} className="hover:bg-paper/60">
                <td className="min-w-60 px-4 py-3">
                  <Link href={href(s.id)} className="font-medium hover:text-ledger">{s.name}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {zone && (
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                          <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 10 8 14 8 14zM8 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                        </svg>
                        {zone}
                      </span>
                    )}
                    {s.repeat && s.repeat !== "none" && (
                      <span className="text-ledger" title="Ricerca ricorrente">↻ {s.repeat === "weekly" ? "settimanale" : "mensile"}</span>
                    )}
                    {s.alert && <Badge tone="ledger" title="Avviso settimanale gratuito attivo">Avviso</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isOpportunity(s) ? <Badge tone="stamp">Opportunità</Badge> : <Badge tone="sky">Target</Badge>}
                </td>
                <td className="px-4 py-3"><SearchStatus status={s.status} /></td>
                <td className="w-40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Progress value={s.delivered} max={s.quantity} />
                    <span className="shrink-0 font-mono text-xs">{s.delivered}/{s.quantity}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2">{MODE_SHORT[s.email_mode] ?? MODE_INFO[s.email_mode as EmailMode]?.label ?? s.email_mode}</td>
                <td className="px-4 py-3 text-right font-mono">{s.credits_charged}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="block">{day(s.created_at)}</span>
                  <span className="block text-xs text-muted">{time(s.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <ButtonLink href={href(s.id)} variant="secondary" size="sm">Visualizza</ButtonLink>
                    {actions && <SearchRowMenu id={s.id} repeating={Boolean(s.repeat && s.repeat !== "none")} hasLeads={s.delivered > 0} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
