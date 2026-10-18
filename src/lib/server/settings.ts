import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY_MODES, EMAIL_MODES, type EmailMode } from "@/lib/domain/catalog";

// Interruttore dei referenti (app_settings "people_enabled", migrazione 037): spento, il
// servizio consegna solo dati delle aziende e il database rifiuta le altre modalità.
export async function getPeopleEnabled() {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "people_enabled").maybeSingle();
    return data?.value === true;
  } catch {
    return false;
  }
}

export async function getEnabledModes(): Promise<readonly EmailMode[]> {
  return (await getPeopleEnabled()) ? EMAIL_MODES : COMPANY_MODES;
}
