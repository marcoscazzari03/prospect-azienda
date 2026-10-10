import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Card, Input, PageHeader, Select, Stat } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/domain/pricing";
import { adjustCredits, setOrgPlan, setOrgStatus } from "../../actions";
import { requireAdmin } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params }: PageProps<"/admin/clienti/[id]">) {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: org }, { data: balance }, { data: searches }, { data: ledger }, { data: payments }, { data: members }, { data: plans }] = await Promise.all([
    db.from("organizations").select("*").eq("id", id).maybeSingle(),
    db.from("org_balances").select("available").eq("org_id", id).maybeSingle(),
    db.from("searches").select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at").eq("org_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("credit_ledger").select("id, delta, kind, description, created_at").eq("org_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("payments").select("amount_cents").eq("org_id", id).eq("status", "paid"),
    db.from("memberships").select("role, profiles:user_id(email, full_name)").eq("org_id", id),
    db.from("plans").select("id, name").order("sort"),
  ]);
  if (!org) notFound();
  const revenue = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);

  return (
    <>
      <PageHeader eyebrow="Cliente" title={org.name} description={(members ?? []).map((m) => `${(m.profiles as unknown as { email: string }).email} (${m.role})`).join(" · ")} />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Crediti" value={balance?.available ?? 0} tone="ledger" />
        <Stat label="Piano" value={org.plan_id} />
        <Stat label="Incassato" value={formatEur(revenue)} />
        <Stat label="Stato" value={org.status === "active" ? "Attivo" : "Sospeso"} tone={org.status === "active" ? "ink" : "stamp"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="mb-3 font-medium">Rettifica crediti</p>
          <form action={adjustCredits} className="flex flex-col gap-2">
            <input type="hidden" name="orgId" value={id} />
            <Input name="delta" type="number" required placeholder="es. 50 o -10" />
            <Input name="reason" required placeholder="Motivo (finisce nel registro)" />
            <Button type="submit" variant="secondary">Applica</Button>
          </form>
        </Card>
        <Card className="p-5">
          <p className="mb-3 font-medium">Piano (manuale)</p>
          <form action={setOrgPlan} className="flex flex-col gap-2">
            <input type="hidden" name="orgId" value={id} />
            <Select name="planId" defaultValue={org.plan_id}>{(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            <Button type="submit" variant="secondary">Imposta</Button>
          </form>
          <p className="mt-2 text-xs text-muted">Per gli abbonamenti Stripe il piano viene aggiornato in automatico.</p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 font-medium">Accesso</p>
          <form action={setOrgStatus}>
            <input type="hidden" name="orgId" value={id} />
            <input type="hidden" name="status" value={org.status === "active" ? "suspended" : "active"} />
            <Button type="submit" variant={org.status === "active" ? "danger" : "primary"} className="w-full">{org.status === "active" ? "Sospendi l'account" : "Riattiva l'account"}</Button>
          </form>
          <p className="mt-2 text-xs text-muted">Un account sospeso non può avviare ricerche.</p>
        </Card>
      </div>
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">Ricerche</h2>
      <SearchTable searches={(searches ?? []) as SearchListItem[]} href={(sid) => `/admin/ricerche?id=${sid}`} />
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">Registro crediti</h2>
      <Card className="divide-y divide-line">
        {(ledger ?? []).map((l) => (
          <div key={l.id} className="flex justify-between px-4 py-2 text-sm">
            <span>{l.description || l.kind} <span className="text-xs text-muted">· {new Date(l.created_at).toLocaleString("it-IT")}</span></span>
            <span className="font-mono">{l.delta > 0 ? "+" : ""}{l.delta}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
