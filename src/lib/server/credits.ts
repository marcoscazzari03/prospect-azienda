import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Crediti accreditati ancora validi (pacchetti, abbonamenti, regali), meno
// quelli già scaduti: la base della barra "crediti rimasti".
export async function validCreditsTotal(orgId: string) {
  const { data: lots } = await createAdminClient().rpc("credit_lots", { p_org: orgId });
  const now = Date.now();
  return (lots ?? [])
    .filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now)
    .reduce((s, l) => s + l.granted - l.expired, 0);
}
