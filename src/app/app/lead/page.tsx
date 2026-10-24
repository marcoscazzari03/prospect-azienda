import type { Metadata } from "next";
import Link from "next/link";
import { ActionMenu } from "@/components/action-menu";
import { ContactNotice } from "@/components/contact-notice";
import { menuItem } from "@/components/menu-item";
import { LeadsTable } from "@/components/leads-table";
import { Badge, Button, ButtonLink, EmptyState, Input, PageHeader, Select, cx } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES, LEAD_STAGE_LABEL, offersBySearch, type DeliveryRow } from "@/lib/domain/leads";
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
  const segnali = ["si", "no"].includes(str("segnali")) ? str("segnali") : "";
  const ricerca = str("ricerca");
  const fase = (LEAD_STAGES as readonly string[]).includes(str("fase")) ? str("fase") : "";
  const lista = /^[0-9a-f-]{36}$/i.test(str("lista")) ? str("lista") : "";
  // Archiviati: vista a parte; gli eliminati non si vedono mai.
  const archivio = str("archivio") === "1" ? "1" : "";
  const page = Math.max(1, Number(str("pagina")) || 1);

  const supabase = await createClient();
  const { data: lists } = await supabase.from("lead_lists").select("id, name").order("name");
  const inList = lista
    ? ((await supabase.from("lead_list_items").select("delivery_id").eq("list_id", lista).limit(5000)).data ?? []).map((x) => x.delivery_id)
    : null;
  let query = supabase
    .from("deliveries")
    .select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at, stage, notes, archived_at, opted_out_at, lead_list_items(list_id)", { count: "exact" })
    .is("deleted_at", null)
    .order("delivered_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  query = archivio ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q) query = query.or(`email_address.ilike.%${q}%,data->company->>name.ilike.%${q}%,data->person->>full_name.ilike.%${q}%,data->person->>job_title.ilike.%${q}%`);
  if (tipo === "personal" || tipo === "generic") query = query.eq("email_type", tipo);
  if (stato === "found_public" || stato === "validated") query = query.eq("email_status", stato);
  if (ricerca) query = query.eq("search_id", ricerca);
  if (fase) query = query.eq("stage", fase);
  if (segnali === "si") query = query.not("data->signals", "is", null);
  if (segnali === "no") query = query.is("data->signals", null);
  if (inList) query = query.in("id", inList.length ? inList : ["00000000-0000-0000-0000-000000000000"]);

  const [{ data, count }, { data: searches }] = await Promise.all([
    query,
    supabase.from("searches").select("id, name, target").order("created_at", { ascending: false }).limit(500),
  ]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (over: Record<string, string>) => new URLSearchParams({ q, tipo, stato, segnali, ricerca, fase, lista, archivio, ...over }).toString();
  const exportQs = (format: string) =>
    new URLSearchParams({ format, ...(ricerca ? { search: ricerca } : {}), ...(tipo ? { tipo } : {}), ...(fase ? { fase } : {}), ...(lista ? { lista } : {}), ...(archivio ? { archivio } : {}) }).toString();

  return (
    <>
      <PageHeader
        title="Lead"
        description={archivio ? `${total} lead archiviati. Puoi ripristinarli quando vuoi.` : `${total} lead acquistati. Ogni azienda resta tua: non te la riproporremo in altre ricerche.`}
        actions={
          total ? (
            <ActionMenu label="Esporta">
              <a href={`/api/export?${exportQs("xlsx")}`} className={menuItem}>
                <span className="font-medium">Excel</span>
                <span className="text-xs text-muted">Con filtri e il foglio «Come usarli»</span>
              </a>
              <a href={`/api/export?${exportQs("csv")}`} className={menuItem}>
                <span className="font-medium">CSV</span>
                <span className="text-xs text-muted">Per importarli nel tuo CRM</span>
              </a>
              <p className="px-3 pb-1 pt-2 text-xs text-muted">Si esportano i lead mostrati, con i filtri attivi.</p>
            </ActionMenu>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Liste</span>
        <Link href={`?${qs({ lista: "", archivio: "", pagina: "1" })}`}><Badge tone={lista || archivio ? "neutral" : "ledger"}>Tutti i lead</Badge></Link>
        {(lists ?? []).map((l) => (
          <span key={l.id} className="inline-flex items-center">
            <Link href={`?${qs({ lista: l.id, archivio: "", pagina: "1" })}`}><Badge tone={lista === l.id ? "ledger" : "neutral"}>{l.name}</Badge></Link>
            {lista === l.id && (
              <form action={deleteList}>
                <input type="hidden" name="listId" value={l.id} />
                <button className={cx("ml-1 text-xs text-ink-2 underline")} title="Elimina la lista (i lead restano)">elimina</button>
              </form>
            )}
          </span>
        ))}
        <Link href={`?${qs({ lista: "", archivio: "1", pagina: "1" })}`}><Badge tone={archivio ? "ledger" : "neutral"}>Archiviati</Badge></Link>
        <div className="ml-auto"><NewListForm /></div>
      </div>
      <form className="mb-6 grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]">
        {lista && <input type="hidden" name="lista" value={lista} />}
        {archivio && <input type="hidden" name="archivio" value={archivio} />}
        <Input name="q" defaultValue={q} placeholder="Cerca azienda, sito, email" aria-label="Cerca" />
        <Select name="stato" defaultValue={stato} aria-label="Stato email">
          <option value="">Ogni stato</option>
          <option value="found_public">Trovate sul sito</option>
          <option value="validated">Verificate</option>
        </Select>
        <Select name="segnali" defaultValue={segnali} aria-label="Opportunità">
          <option value="">Tutti i lead</option>
          <option value="si">Con opportunità</option>
          <option value="no">Solo in target</option>
        </Select>
        <Select name="fase" defaultValue={fase} aria-label="Fase commerciale">
          <option value="">Ogni fase</option>
          {LEAD_STAGES.map((st) => <option key={st} value={st}>{LEAD_STAGE_LABEL[st]}</option>)}
        </Select>
        <Select name="ricerca" defaultValue={ricerca} aria-label="Ricerca">
          <option value="">Tutte le ricerche</option>
          {(searches ?? []).slice(0, 100).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Filtra</Button>
      </form>
      {data?.length ? (
        <>
          <ContactNotice />
          <LeadsTable rows={data as DeliveryRow[]} lists={lists ?? []} offers={offersBySearch(searches)} archived={Boolean(archivio)} />
          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page - 1) })}`}>← Precedenti</Link> : <span />}
              <span className="text-muted">Pagina {page} di {pages}</span>
              {page < pages ? <Link className="text-ledger underline" href={`?${qs({ pagina: String(page + 1) })}`}>Successivi →</Link> : <span />}
            </nav>
          )}
        </>
      ) : (
        <EmptyState title={archivio ? "Nessun lead archiviato" : q || tipo || stato || segnali || ricerca || fase || lista ? "Nessun lead con questi filtri" : "Ancora nessun lead"} action={<ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink>} />
      )}
    </>
  );
}
