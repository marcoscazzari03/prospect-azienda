import type { Metadata } from "next";
import Link from "next/link";
import { LeadsTable } from "@/components/leads-table";
import { Badge, Button, ButtonLink, EmptyState, Input, PageHeader, Select, cx } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES, LEAD_STAGE_LABEL, type DeliveryRow } from "@/lib/domain/leads";
import { deleteList } from "./actions";
import { NewListForm } from "./new-list-form";

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
  const fase = (LEAD_STAGES as readonly string[]).includes(str("fase")) ? str("fase") : "";
  const lista = /^[0-9a-f-]{36}$/i.test(str("lista")) ? str("lista") : "";
  const page = Math.max(1, Number(str("pagina")) || 1);

  const supabase = await createClient();
  const { data: lists } = await supabase.from("lead_lists").select("id, name").order("name");
  const inList = lista
    ? ((await supabase.from("lead_list_items").select("delivery_id").eq("list_id", lista).limit(5000)).data ?? []).map((x) => x.delivery_id)
    : null;
  let query = supabase
    .from("deliveries")
    .select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at, stage, notes, lead_list_items(list_id)", { count: "exact" })
    .order("delivered_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`email_address.ilike.%${q}%,data->company->>name.ilike.%${q}%,data->person->>full_name.ilike.%${q}%,data->person->>job_title.ilike.%${q}%`);
  if (tipo === "personal" || tipo === "generic") query = query.eq("email_type", tipo);
  if (stato === "found_public" || stato === "validated") query = query.eq("email_status", stato);
  if (ricerca) query = query.eq("search_id", ricerca);
  if (fase) query = query.eq("stage", fase);
  if (inList) query = query.in("id", inList.length ? inList : ["00000000-0000-0000-0000-000000000000"]);

  const [{ data, count }, { data: searches }] = await Promise.all([
    query,
    supabase.from("searches").select("id, name").order("created_at", { ascending: false }).limit(100),
  ]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (over: Record<string, string>) => new URLSearchParams({ q, tipo, stato, ricerca, fase, lista, ...over }).toString();
  const exportQs = (format: string) =>
    new URLSearchParams({ format, ...(ricerca ? { search: ricerca } : {}), ...(tipo ? { tipo } : {}), ...(fase ? { fase } : {}), ...(lista ? { lista } : {}) }).toString();

  return (
    <>
      <PageHeader
        title="Lead"
        description={`${total} lead acquistati. Ogni contatto resta tuo: non te lo riproporremo in altre ricerche.`}
        actions={
          total ? (
            <div className="flex gap-2">
              <ButtonLink href={`/api/export?${exportQs("xlsx")}`} variant="secondary" prefetch={false}>Esporta Excel</ButtonLink>
              <ButtonLink href={`/api/export?${exportQs("csv")}`} variant="ghost" prefetch={false}>CSV</ButtonLink>
            </div>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Liste</span>
        <Link href={`?${qs({ lista: "", pagina: "1" })}`}><Badge tone={lista ? "neutral" : "ledger"}>Tutti i lead</Badge></Link>
        {(lists ?? []).map((l) => (
          <span key={l.id} className="inline-flex items-center">
            <Link href={`?${qs({ lista: l.id, pagina: "1" })}`}><Badge tone={lista === l.id ? "ledger" : "neutral"}>{l.name}</Badge></Link>
            {lista === l.id && (
              <form action={deleteList}>
                <input type="hidden" name="listId" value={l.id} />
                <button className={cx("ml-1 text-xs text-ink-2 underline")} title="Elimina la lista (i lead restano)">elimina</button>
              </form>
            )}
          </span>
        ))}
        <div className="ml-auto"><NewListForm /></div>
      </div>
      <form className="mb-6 grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]">
        {lista && <input type="hidden" name="lista" value={lista} />}
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
        <Select name="fase" defaultValue={fase} aria-label="Stato del contatto">
          <option value="">Ogni contatto</option>
          {LEAD_STAGES.map((st) => <option key={st} value={st}>{LEAD_STAGE_LABEL[st]}</option>)}
        </Select>
        <Select name="ricerca" defaultValue={ricerca} aria-label="Ricerca">
          <option value="">Tutte le ricerche</option>
          {(searches ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Filtra</Button>
      </form>
      {data?.length ? (
        <>
          <LeadsTable rows={data as DeliveryRow[]} lists={lists ?? []} />
          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page - 1) })}`}>← Precedenti</Link> : <span />}
              <span className="text-muted">Pagina {page} di {pages}</span>
              {page < pages ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page + 1) })}`}>Successivi →</Link> : <span />}
            </nav>
          )}
        </>
      ) : (
        <EmptyState title={q || tipo || stato || ricerca || fase || lista ? "Nessun lead con questi filtri" : "Ancora nessun lead"} action={<ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink>} />
      )}
    </>
  );
}
