import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchesBrowser } from "@/components/searches-browser";
import type { SearchListItem } from "@/components/search-table";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ricerche" };

export default async function SearchesPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("searches")
    .select("id, name, status, email_mode, quantity, delivered, credits_charged, created_at, repeat, signals:target->signals->codes, regions:target->regions, countries:target->countries")
    .order("created_at", { ascending: false })
    .limit(1000);
  return (
    <>
      <PageHeader
        title="Ricerche"
        description="Monitora, filtra e gestisci tutte le ricerche del tuo account."
        actions={<><ButtonLink href="/app/ricerche/nuova?tipo=opportunita" variant="secondary">Trova opportunità</ButtonLink><ButtonLink href="/app/ricerche/nuova">Nuova ricerca</ButtonLink></>}
      />
      {data?.length ? <SearchesBrowser searches={data as SearchListItem[]} /> : <EmptyState title="Nessuna ricerca" action={<ButtonLink href="/app/ricerche/nuova">Avvia una ricerca</ButtonLink>} />}
    </>
  );
}
