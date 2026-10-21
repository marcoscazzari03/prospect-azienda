import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchesBrowser } from "@/components/searches-browser";
import type { SearchListItem } from "@/components/search-table";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ricerche" };

export default async function SearchesPage({ searchParams }: PageProps<"/app/ricerche">) {
  await requireViewer();
  // Archiviate: vista a parte; le eliminate non si vedono mai.
  const archivio = (await searchParams).archivio === "1";
  const supabase = await createClient();
  const base = supabase
    .from("searches")
    .select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at, repeat, signals:target->signals->codes, regions:target->regions, countries:target->countries")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  const [{ data: rows }, { data: alerts }] = await Promise.all([
    archivio ? base.not("archived_at", "is", null) : base.is("archived_at", null),
    supabase.from("search_alerts").select("search_id"),
  ]);
  // Avviso settimanale attivo (migrazione 056): etichetta accanto al nome.
  const withAlert = new Set((alerts ?? []).map((a) => a.search_id));
  const data = rows?.map((r) => ({ ...r, alert: withAlert.has(r.id) }));
  return (
    <>
      <PageHeader
        title="Ricerche"
        description={archivio
          ? <>Ricerche archiviate: aprile per ripristinarle. <Link href="/app/ricerche" className="text-ledger underline">Torna alle ricerche</Link></>
          : <>Monitora, filtra e gestisci tutte le ricerche del tuo account. <Link href="/app/ricerche?archivio=1" className="text-ledger underline">Archiviate</Link></>}
        actions={<><ButtonLink href="/app/ricerche/nuova?tipo=opportunita" variant="secondary">Trova opportunità</ButtonLink><ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink></>}
      />
      {data?.length ? <SearchesBrowser searches={data as SearchListItem[]} /> : <EmptyState title={archivio ? "Nessuna ricerca archiviata" : "Nessuna ricerca"} action={archivio ? undefined : <ButtonLink href="/app/ricerche/nuova">Avvia una ricerca</ButtonLink>} />}
    </>
  );
}
