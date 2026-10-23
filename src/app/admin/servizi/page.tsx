import type { Metadata } from "next";
import { Button, Card, PageHeader, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/server/dal";
import { getOffers } from "@/lib/server/offer-rules";
import { OFFER_AREAS } from "@/lib/domain/signals";
import { OfferRuleForm } from "./offer-rule-form";
import { getSuggestedMode } from "@/lib/server/suggestions";
import { updateSuggestedMode } from "../actions";

export const metadata: Metadata = { title: "Servizi opportunità" };

export default async function OffersAdminPage() {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const [offers, suggested] = await Promise.all([getOffers(), getSuggestedMode()]);
  return (
    <>
      <PageHeader
        title="Servizi opportunità"
        description="Per ogni servizio che il cliente può scegliere: quali segnali cerchiamo, come combinarli e la frase del riepilogo. Le modifiche valgono per le ricerche create da ora in poi; quelle già avviate tengono la loro regola."
      />
      <Card className="mb-10 p-5">
        <h2 className="font-display text-xl font-semibold">Ricerche consigliate in dashboard</h2>
        <p className="mt-1 text-sm text-muted">
          «Di cosa si occupa la tua attività?» e fino a 3 ricerche proposte da Claude Haiku, solo verso aziende e solo con lead nel
          database. Prima solo per gli admin, per tutti con il passaggio ad Avvisto.
        </p>
        <form action={updateSuggestedMode} className="mt-4 flex flex-wrap items-end gap-3">
          <Select name="mode" defaultValue={suggested} className="w-64" aria-label="Chi vede le ricerche consigliate">
            <option value="off">Spente</option>
            <option value="admin">Solo admin (prove)</option>
            <option value="all">Tutti gli utenti</option>
          </Select>
          <Button type="submit" variant="secondary">Salva</Button>
        </form>
      </Card>
      <div className="flex flex-col gap-10">
        {OFFER_AREAS.map((a) => (
          <section key={a.code}>
            <h2 className="mb-3 font-display text-xl font-semibold">{a.label}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {offers.filter((o) => o.area === a.code).map((o) => <OfferRuleForm key={o.code} offer={o} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
