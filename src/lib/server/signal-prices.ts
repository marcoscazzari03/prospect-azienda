import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SIGNAL_PRICES, type SignalPrices } from "@/lib/domain/signals";

const clamp = (v: unknown, def: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : def;
};

// Crediti in più per lead con segnale, come li legge il database (signal_prices()).
export async function getSignalPrices(): Promise<SignalPrices> {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "signal_extra_credits").maybeSingle();
    const v = (data?.value ?? {}) as Partial<Record<keyof SignalPrices, unknown>>;
    return { website: clamp(v.website, DEFAULT_SIGNAL_PRICES.website), job_ad: clamp(v.job_ad, DEFAULT_SIGNAL_PRICES.job_ad) };
  } catch {
    return DEFAULT_SIGNAL_PRICES;
  }
}
