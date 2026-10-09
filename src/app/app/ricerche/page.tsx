import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchTable, type SearchListItem } from "@/components/search-table";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ricerche" };

export default async function SearchesPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("searches")
    .select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Ricerche" description="Tutte le ricerche avviate dal tuo account." actions={<ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink>} />
      {data?.length ? <SearchTable searches={data as SearchListItem[]} /> : <EmptyState title="Nessuna ricerca" action={<ButtonLink href="/app/ricerche/nuova">Avvia una ricerca</ButtonLink>} />}
    </>
  );
}
