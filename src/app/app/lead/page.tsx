import type { Metadata } from "next";
import Link from "next/link";
import { LeadsTable } from "@/components/leads-table";
import { Button, ButtonLink, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryRow } from "@/lib/domain/leads";

export const metadata: Metadata = { title: "Lead" };
const PAGE = 50;

export default async function LeadsPage({ searchParams }: PageProps<"/app/lead">) {
  await requireViewer();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").replace(/[%,()*]/g, " ").trim().slice(0, 80);
  const tipo = str("tipo");
  const stato = str("stato");
  const ricerca = str("ricerca");
  const page = Math.max(1, Number(str("pagina")) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("deliveries")
    .select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at", { count: "exact" })
    .order("delivered_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`email_address.ilike.%${q}%,data->company->>name.ilike.%${q}%,data->person->>full_name.ilike.%${q}%,data->person->>job_title.ilike.%${q}%`);
  if (tipo === "personal" || tipo === "generic") query = query.eq("email_type", tipo);
  if (stato === "found_public" || stato === "validated") query = query.eq("email_status", stato);
  if (ricerca) query = query.eq("search_id", ricerca);

  const [{ data, count }, { data: searches }] = await Promise.all([
    query,
    supabase.from("searches").select("id, name").order("created_at", { ascending: false }).limit(100),
  ]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (over: Record<string, string>) => new URLSearchParams({ q, tipo, stato, ricerca, ...over }).toString();
  const exportQs = new URLSearchParams({ ...(ricerca ? { search: ricerca } : {}), ...(tipo ? { tipo } : {}) }).toString();

  return (
    <>
      <PageHeader
        title="Lead"
        description={`${total} lead acquistati. Ogni contatto resta tuo: non te lo riproporremo in altre ricerche.`}
        actions={total ? <ButtonLink href={`/api/export${exportQs ? `?${exportQs}` : ""}`} variant="secondary" prefetch={false}>Esporta CSV</ButtonLink> : undefined}
      />
      <form className="mb-6 grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
        <Input name="q" defaultValue={q} placeholder="Cerca nome, azienda, ruolo, email" aria-label="Cerca" />
        <Select name="tipo" defaultValue={tipo} aria-label="Tipo email">
          <option value="">Tutte le email</option>
          <option value="personal">Nominative</option>
          <option value="generic">Generiche</option>
        </Select>
        <Select name="stato" defaultValue={stato} aria-label="Stato email">
          <option value="">Ogni stato</option>
          <option value="found_public">Trovate sul sito</option>
          <option value="validated">Verificate</option>
        </Select>
        <Select name="ricerca" defaultValue={ricerca} aria-label="Ricerca">
          <option value="">Tutte le ricerche</option>
          {(searches ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Filtra</Button>
      </form>
      {data?.length ? (
        <>
          <LeadsTable rows={data as DeliveryRow[]} />
          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page - 1) })}`}>← Precedenti</Link> : <span />}
              <span className="text-muted">Pagina {page} di {pages}</span>
              {page < pages ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page + 1) })}`}>Successivi →</Link> : <span />}
            </nav>
          )}
        </>
      ) : (
        <EmptyState title={q || tipo || stato || ricerca ? "Nessun lead con questi filtri" : "Ancora nessun lead"} action={<ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink>} />
      )}
    </>
  );
}
