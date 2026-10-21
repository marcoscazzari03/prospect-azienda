import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { getSignalPrices } from "@/lib/server/signal-prices";
import { getEnabledOffers } from "@/lib/server/offer-rules";
import { getEnabledModes } from "@/lib/server/settings";
import { createClient } from "@/lib/supabase/server";
import { SearchWizard, type SearchKind, type WizardDefaults } from "./wizard";
import { withoutSynonyms, type SearchTarget } from "@/lib/domain/search-input";
import type { EmailMode } from "@/lib/domain/catalog";

export const metadata: Metadata = { title: "Nuova ricerca" };

export default async function NewSearchPage({ searchParams }: PageProps<"/app/ricerche/nuova">) {
  const viewer = await requireViewer();
  const { da, tipo } = await searchParams;
  let defaults: WizardDefaults = {};
  if (typeof da === "string") {
    // "Ripeti la ricerca": stessi filtri; le aziende già ricevute sono escluse in automatico.
    const supabase = await createClient();
    const { data } = await supabase.from("searches").select("name, target, email_mode, quantity, contacts_per_company").eq("id", da).maybeSingle();
    if (data) {
      const t = data.target as SearchTarget;
      defaults = {
        name: `${data.name} (2)`,
        industry: t.industry,
        industryKeywords: withoutSynonyms(t.industry_keywords ?? []),
        countries: t.countries,
        regions: t.regions,
        companySizes: t.company_size,
        revenueRange: t.revenue_range,
        roles: t.roles,
        keywords: t.keywords,
        excludeKeywords: t.exclude_keywords,
        notes: t.notes,
        emailMode: data.email_mode as EmailMode,
        contact: t.contact ?? "email_only",
        quantity: data.quantity,
        contactsPerCompany: data.contacts_per_company,
        offer: t.signals?.offer,
      };
    }
  }
  const kind: SearchKind = tipo === "opportunita" || defaults.offer ? "opportunity" : "standard";
  // Prezzo indicativo di un credito: quello del piano in abbonamento o del pacchetto, altrimenti
  // il pacchetto più piccolo (chi ha i crediti di benvenuto ricomprerà da lì).
  const plan = viewer.plan;
  let centsPerCredit = plan && plan.price_cents > 0 && plan.credits > 0 ? plan.price_cents / plan.credits : 0;
  if (!centsPerCredit) {
    const supabase = await createClient();
    const { data: packs } = await supabase.from("plans").select("price_cents, credits").eq("kind", "pack").eq("active", true).order("price_cents").limit(1);
    const p = packs?.[0];
    centsPerCredit = p && p.credits > 0 ? p.price_cents / p.credits : 0;
  }
  return (
    <>
      <PageHeader
        eyebrow="Nuova ricerca"
        title="Chi sono i tuoi clienti ideali?"
        description="Scegli il tipo di ricerca. Più sei preciso, più le aziende saranno pertinenti. Quelle che hai già ricevuto vengono escluse in automatico."
      />
      <SearchWizard credits={viewer.credits} maxQuantity={viewer.plan?.max_quantity_per_search ?? 10} defaults={defaults} initialKind={kind} signalPrices={await getSignalPrices()} offers={await getEnabledOffers()} centsPerCredit={centsPerCredit} modes={await getEnabledModes()} />
    </>
  );
}
