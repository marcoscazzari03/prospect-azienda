import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { checkoutAllowed } from "@/lib/server/stripe";
import { requireViewer } from "@/lib/server/dal";
import { loadAccount } from "../account-data";
import { BillingSection } from "../account-sections";

export const metadata: Metadata = { title: "Piano e fatturazione" };

export default async function BillingPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [account, { data: payments }, { data: sub }] = await Promise.all([
    loadAccount(),
    supabase.from("payments").select("id, kind, amount_cents, status, invoice_url, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("subscriptions").select("plan_id, status, current_period_end, cancel_at_period_end").maybeSingle(),
  ]);
  return <BillingSection account={account} billing={checkoutAllowed(viewer)} payments={payments ?? []} sub={sub} />;
}
