import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { PriceCalculator } from "@/components/price-calculator";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { getPublicPlans } from "@/lib/server/catalog";
import { getSignalPrices } from "@/lib/server/signal-prices";
import { extraCreditsLabel } from "@/lib/domain/signals";
import { BETA } from "@/lib/config";
import { stripeLive } from "@/lib/server/stripe";

export const metadata: Metadata = { title: "Prezzi" };
export const revalidate = 3600;

export default async function PricingPage() {
  const [plans, prices] = await Promise.all([getPublicPlans(), getSignalPrices()]);
  const free = plans.find((p) => p.kind === "free");
  // Finché Stripe non è live (chiave di test) i pulsanti non portano all'acquisto: si registra e basta.
  const live = stripeLive();
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Prezzi"
        title="Paghi solo le aziende che ricevi."
        description={`Una sola moneta, il credito. Ogni azienda consegnata, con sito, settore, zona ed email aziendale (o, se sul sito non c'è, la pagina del suo modulo di contatto), costa 1 credito. Con un'opportunità verificata costa ${extraCreditsLabel(prices)}. La ricerca estesa, quando i filtri vanno oltre il nostro database (dimensione, fatturato, parole chiave, paesi esteri) e cerchiamo aziende nuove sul web, costa 1 credito in più. I crediti riservati e non usati tornano sempre disponibili.`}
      />
      {BETA.open && (
        <Card className="mb-6 flex flex-col gap-4 border-ledger p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold">Sei stato invitato alla beta?</p>
            <p className="text-ink-2">Per 4 settimane è gratuita: crediti inclusi, nessuna carta. Chi continua dopo la beta ha il 30% di sconto per 12 mesi.</p>
          </div>
          <ButtonLink href={BETA.signupHref}>Entra nella beta</ButtonLink>
        </Card>
      )}
      {free && (
        <Card className="mb-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold">Inizia gratis</p>
            <p className="text-ink-2">{free.credits} crediti per provare il servizio su un target reale, senza carta di credito.</p>
            <p className="mt-1 text-sm text-muted">Lavori da solo o fai ricerche ogni tanto? Dopo la prova basta un pacchetto: niente abbonamento, crediti validi 12 mesi.</p>
          </div>
          <ButtonLink href="/registrati">Crea l&apos;account</ButtonLink>
        </Card>
      )}
      <PricingTable
        plans={plans}
        action={(p) => (
          <ButtonLink href={live ? `/registrati?piano=${p.id}` : "/registrati"} variant={p.highlighted ? "primary" : "secondary"} className="w-full">
            {!live ? "Prova gratis" : p.kind === "subscription" ? "Inizia con " + p.name : "Acquista"}
          </ButtonLink>
        )}
      />
      <div className="mt-16">
        <h2 className="mb-6 font-display text-2xl font-semibold">Calcola quanto ti serve</h2>
        <PriceCalculator signalPrices={prices} />
      </div>
      <p className="mt-8 text-sm text-muted">
        Prezzi IVA esclusa. Volumi superiori a 2.000 aziende al mese o fatturazione annuale: scrivici per un&apos;offerta su misura.
      </p>
    </div>
  );
}
