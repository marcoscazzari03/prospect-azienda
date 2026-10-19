import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadAccount } from "../account-data";
import { SecuritySection } from "../account-sections";

export const metadata: Metadata = { title: "Sicurezza" };

export default async function SecurityPage() {
  const account = await loadAccount();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp?.find((f) => f.status === "verified");
  return <SecuritySection account={account} mfa={{ enabled: Boolean(factor), since: factor?.created_at ?? null }} />;
}
