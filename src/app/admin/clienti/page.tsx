import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Clienti" };

export default async function ClientsPage() {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: orgs }, { data: balances }, { data: members }] = await Promise.all([
    db.from("organizations").select("id, name, plan_id, status, created_at").order("created_at", { ascending: false }).limit(500),
    db.from("org_balances").select("org_id, available"),
    db.from("memberships").select("org_id, role, profiles:user_id(email)").eq("role", "owner"),
  ]);
  const bal = new Map((balances ?? []).map((b) => [b.org_id, b.available]));
  const owner = new Map((members ?? []).map((m) => [m.org_id, (m.profiles as unknown as { email: string } | null)?.email ?? ""]));
  return (
    <>
      <PageHeader title="Clienti" description={`${orgs?.length ?? 0} organizzazioni`} />
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Organizzazione</th><th className="px-4 py-3">Titolare</th><th className="px-4 py-3">Piano</th><th className="px-4 py-3 text-right">Crediti</th><th className="px-4 py-3 text-right">Dal</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(orgs ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-paper/60">
                <td className="px-4 py-3"><Link href={`/admin/clienti/${o.id}`} className="font-medium hover:text-ledger">{o.name}</Link> {o.status === "suspended" && <Badge tone="brick">Sospeso</Badge>}</td>
                <td className="px-4 py-3 text-ink-2">{owner.get(o.id)}</td>
                <td className="px-4 py-3"><Badge tone={o.plan_id === "free" ? "neutral" : "ledger"}>{o.plan_id}</Badge></td>
                <td className="px-4 py-3 text-right font-mono">{bal.get(o.id) ?? 0}</td>
                <td className="px-4 py-3 text-right text-muted">{new Date(o.created_at).toLocaleDateString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
