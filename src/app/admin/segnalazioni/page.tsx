import type { Metadata } from "next";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReport, suppress } from "../actions";

export const metadata: Metadata = { title: "Segnalazioni e GDPR" };

const REASON: Record<string, string> = {
  bounce: "Email rimbalza", wrong_role: "Ruolo sbagliato", company_closed: "Azienda chiusa", out_of_target: "Fuori target", duplicate: "Duplicato", other: "Altro",
};

export default async function ReportsPage() {
  const db = createAdminClient();
  const [{ data: reports }, { count: suppressed }, { data: optouts }] = await Promise.all([
    db.from("lead_reports").select("id, reason, note, status, refund_credits, created_at, organizations(name), deliveries(email_address, data)").order("created_at", { ascending: false }).limit(100),
    db.from("suppression_list").select("id", { count: "exact", head: true }),
    db.from("optout_requests").select("id, status, whole_domain, created_at, confirmed_at").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <>
      <PageHeader title="Segnalazioni e GDPR" description="Lead segnalati dai clienti, lista di opposizione e richieste di rimozione." />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="divide-y divide-line">
          {(reports ?? []).map((r) => {
            const d = r.deliveries as unknown as { email_address: string; data: { person?: { full_name?: string }; company?: { name?: string } } } | null;
            return (
              <div key={r.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{d?.data.person?.full_name} · {d?.data.company?.name} <span className="font-mono text-xs text-ink-2">{d?.email_address}</span></p>
                  <p className="text-xs text-muted">{(r.organizations as unknown as { name: string } | null)?.name} · {REASON[r.reason]} · {new Date(r.created_at).toLocaleDateString("it-IT")}{r.note && ` · «${r.note}»`}</p>
                </div>
                {r.status === "open" ? (
                  <div className="flex gap-2">
                    <form action={resolveReport}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="approve" value="1" /><Button size="sm">Rimborsa</Button></form>
                    <form action={resolveReport}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="approve" value="0" /><Button size="sm" variant="secondary">Respingi</Button></form>
                  </div>
                ) : (
                  <Badge tone={r.status === "refunded" ? "ledger" : "neutral"}>{r.status === "refunded" ? `Rimborsato ${r.refund_credits} cr.` : "Respinto"}</Badge>
                )}
              </div>
            );
          })}
          {!reports?.length && <p className="p-6 text-sm text-muted">Nessuna segnalazione.</p>}
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="font-medium">Lista di opposizione</p>
            <p className="mt-1 text-sm text-muted">{suppressed ?? 0} voci (solo impronte cifrate).</p>
            <form action={suppress} className="mt-3 flex flex-col gap-2">
              <Input name="value" placeholder="email@azienda.it oppure azienda.it" required />
              <Button size="sm" variant="secondary">Escludi per sempre</Button>
            </form>
          </Card>
          <Card className="p-5">
            <p className="mb-2 font-medium">Richieste di rimozione recenti</p>
            {(optouts ?? []).map((o) => (
              <p key={o.id} className="text-xs text-ink-2">{new Date(o.created_at).toLocaleDateString("it-IT")} · {o.status === "confirmed" ? "confermata" : "in attesa di conferma"}{o.whole_domain ? " · intero dominio" : ""}</p>
            ))}
            {!optouts?.length && <p className="text-xs text-muted">Nessuna.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
