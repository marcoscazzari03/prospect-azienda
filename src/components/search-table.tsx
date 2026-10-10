import Link from "next/link";
import { ButtonLink, Progress, SearchStatus } from "./ui";
import { MODE_INFO, type EmailMode } from "@/lib/domain/catalog";

export type SearchListItem = {
  id: string;
  name: string;
  status: string;
  email_mode: string;
  quantity: number;
  delivered: number;
  credits_charged: number;
  created_at: string;
  repeat?: string;
};

const MODE_SHORT: Record<string, string> = { generic_ok: "Generiche incluse", mixed: "Mista", personal_only: "Solo nominative" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export function SearchTable({ searches, href = (id) => `/app/ricerche/${id}` }: { searches: SearchListItem[]; href?: (id: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Ricerca</th>
            <th className="px-4 py-3 font-medium">Stato</th>
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 text-right font-medium">Crediti</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3"><span className="sr-only">Azioni</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {searches.map((s) => (
            <tr key={s.id} className="hover:bg-paper/60">
              <td className="px-4 py-3">
                <Link href={href(s.id)} className="font-medium hover:text-ledger">{s.name}</Link>
                {s.repeat && s.repeat !== "none" && (
                  <span className="ml-2 text-xs text-ledger" title="Ricerca ricorrente">↻ {s.repeat === "weekly" ? "settimanale" : "mensile"}</span>
                )}
              </td>
              <td className="px-4 py-3"><SearchStatus status={s.status} /></td>
              <td className="w-56 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Progress value={s.delivered} max={s.quantity} />
                  <span className="shrink-0 font-mono text-xs">{s.delivered}/{s.quantity}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-2">{MODE_SHORT[s.email_mode] ?? MODE_INFO[s.email_mode as EmailMode]?.label ?? s.email_mode}</td>
              <td className="px-4 py-3 text-right font-mono">{s.credits_charged}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{fmt(s.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <ButtonLink href={href(s.id)} variant="secondary" size="sm">Visualizza</ButtonLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
