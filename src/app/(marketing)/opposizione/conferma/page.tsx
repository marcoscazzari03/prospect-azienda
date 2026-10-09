import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/server/crypto";

export const metadata: Metadata = { title: "Conferma rimozione" };

export default async function ConfirmOptoutPage({ searchParams }: PageProps<"/opposizione/conferma">) {
  const { token } = await searchParams;
  let ok = false;
  if (typeof token === "string" && /^[a-f0-9]{64}$/.test(token)) {
    const db = createAdminClient();
    const { data: req } = await db.from("optout_requests").select("*").eq("token_hash", sha256Hex(token)).maybeSingle();
    if (req) {
      await db.from("suppression_list").upsert({ email_hash: req.email_hash, reason: "opt_out" }, { onConflict: "email_hash" });
      if (req.whole_domain && req.domain_hash) {
        await db.from("suppression_list").upsert({ domain_hash: req.domain_hash, reason: "opt_out_domain" }, { onConflict: "domain_hash" });
      }
      await db.from("optout_requests").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", req.id);
      ok = true;
    }
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <PageHeader eyebrow="Diritto di opposizione" title={ok ? "Fatto." : "Link non valido"} />
      {ok ? (
        <Alert tone="ledger">Il tuo indirizzo è stato escluso: non verrà più consegnato a nessun cliente della piattaforma.</Alert>
      ) : (
        <Alert tone="brick">Il link è scaduto o non è corretto. Ripeti la richiesta dalla pagina di opposizione.</Alert>
      )}
    </div>
  );
}
