import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyOfferRules, type ActiveOffer, type OfferRules } from "@/lib/domain/signals";

// Servizi della ricerca opportunità con le modifiche dell'admin (app_settings "offer_rules").
export async function getOffers(): Promise<ActiveOffer[]> {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "offer_rules").maybeSingle();
    return applyOfferRules((data?.value ?? {}) as OfferRules);
  } catch {
    return applyOfferRules({});
  }
}

export async function getEnabledOffers() {
  return (await getOffers()).filter((o) => o.enabled);
}
