import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { SearchWizard, type WizardDefaults } from "./wizard";
import type { SearchTarget } from "@/lib/domain/search-input";
import type { EmailMode } from "@/lib/domain/catalog";

export const metadata: Metadata = { title: "Nuova ricerca" };

export default async function NewSearchPage({ searchParams }: PageProps<"/app/ricerche/nuova">) {
  const viewer = await requireViewer();
  const { da } = await searchParams;
  let defaults: WizardDefaults = {};
  if (typeof da === "string") {
    // "Ripeti la ricerca": stessi filtri; i contatti già ricevuti sono esclusi in automatico.
    const supabase = await createClient();
    const { data } = await supabase.from("searches").select("name, target, email_mode, quantity, contacts_per_company").eq("id", da).maybeSingle();
    if (data) {
      const t = data.target as SearchTarget;
      defaults = {
        name: `${data.name} (2)`,
        industry: t.industry,
        industryKeywords: t.industry_keywords,
        countries: t.countries,
        regions: t.regions,
        companySizes: t.company_size,
        revenueRange: t.revenue_range,
        roles: t.roles,
        keywords: t.keywords,
        excludeKeywords: t.exclude_keywords,
        notes: t.notes,
        emailMode: data.email_mode as EmailMode,
        quantity: data.quantity,
        contactsPerCompany: data.contacts_per_company,
      };
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Nuova ricerca"
        title="Chi sono i tuoi clienti ideali?"
        description="Quattro passi. Più sei preciso, più i lead saranno pertinenti. I contatti che hai già ricevuto vengono esclusi in automatico."
      />
      <SearchWizard credits={viewer.credits} maxQuantity={viewer.plan?.max_quantity_per_search ?? 10} defaults={defaults} />
    </>
  );
}
