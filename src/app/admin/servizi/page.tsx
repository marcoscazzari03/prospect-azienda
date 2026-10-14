import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/server/dal";
import { getOffers } from "@/lib/server/offer-rules";
import { OFFER_AREAS } from "@/lib/domain/signals";
import { OfferRuleForm } from "./offer-rule-form";

export const metadata: Metadata = { title: "Servizi opportunità" };

export default async function OffersAdminPage() {
  // Controllo qui e non solo nel layout: il layout non impedisce il rendering della pagina.
  await requireAdmin();
  const offers = await getOffers();
  return (
    <>
      <PageHeader
        title="Servizi opportunità"
        description="Per ogni servizio che il cliente può scegliere: quali segnali cerchiamo, come combinarli e la frase del riepilogo. Le modifiche valgono per le ricerche create da ora in poi; quelle già avviate tengono la loro regola."
      />
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
