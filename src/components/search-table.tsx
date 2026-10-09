import Link from "next/link";
import { Progress, SearchStatus } from "./ui";
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
};

export function SearchTable({ searches, href = (id) => `/app/ricerche/${id}` }: { searches: SearchListItem[]; href?: (id: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Ricerca</th>
            <th className="px-4 py-3 font-medium">Stato</th>
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 text-right font-medium">Crediti</th>
            <th className="px-4 py-3 text-right font-medium">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {searches.map((s) => (
            <tr key={s.id} className="hover:bg-paper/60">
              <td className="px-4 py-3">
                <Link href={href(s.id)} className="font-medium hover:text-ledger">{s.name}</Link>
              </td>
              <td className="px-4 py-3"><SearchStatus status={s.status} /></td>
              <td className="w-48 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Progress value={s.delivered} max={s.quantity} />
                  <span className="shrink-0 font-mono text-xs">{s.delivered}/{s.quantity}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-2">{MODE_INFO[s.email_mode as EmailMode]?.label ?? s.email_mode}</td>
              <td className="px-4 py-3 text-right font-mono">{s.credits_charged}</td>
              <td className="px-4 py-3 text-right text-muted">{new Date(s.created_at).toLocaleDateString("it-IT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
