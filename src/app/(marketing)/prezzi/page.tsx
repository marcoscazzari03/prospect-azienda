import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { PriceCalculator } from "@/components/price-calculator";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { getPublicPlans } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Prezzi" };
export const revalidate = 3600;

export default async function PricingPage() {
  const plans = await getPublicPlans();
  const free = plans.find((p) => p.kind === "free");
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Prezzi"
        title="Paghi solo i lead che ricevi."
        description="Una sola moneta, il credito. Un lead con email generica costa 1 credito, con email nominativa 2, con nominativa verificata 3. I crediti riservati e non usati tornano sempre disponibili."
      />
      {free && (
        <Card className="mb-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold">Inizia gratis</p>
            <p className="text-ink-2">{free.credits} crediti per provare il servizio su un target reale, senza carta di credito.</p>
          </div>
          <ButtonLink href="/registrati">Crea l&apos;account</ButtonLink>
        </Card>
      )}
      <PricingTable
        plans={plans}
        action={(p) => (
          <ButtonLink href={`/registrati?piano=${p.id}`} variant={p.highlighted ? "primary" : "secondary"} className="w-full">
            {p.kind === "subscription" ? "Inizia con " + p.name : "Acquista"}
          </ButtonLink>
        )}
      />
      <div className="mt-16">
        <h2 className="mb-6 font-display text-2xl font-semibold">Calcola quanto ti serve</h2>
        <PriceCalculator />
      </div>
      <p className="mt-8 text-sm text-muted">
        Prezzi IVA esclusa. Volumi superiori a 2.000 lead al mese, API dedicate o fatturazione annuale: scrivici per un&apos;offerta Enterprise.
      </p>
    </div>
  );
}
