import type { Metadata } from "next";
import { requireViewer } from "@/lib/server/dal";
import { createClient } from "@/lib/supabase/server";
import { stripeEnabled } from "@/lib/server/stripe";
import { validCreditsTotal } from "@/lib/server/credits";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Il mio account" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: payments }, { data: sub }, total] = await Promise.all([
    supabase.from("payments").select("id, kind, amount_cents, status, invoice_url, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("subscriptions").select("plan_id, status, current_period_end, cancel_at_period_end").maybeSingle(),
    validCreditsTotal(viewer.org.id),
  ]);
  return (
    <AccountView
      account={{
        email: viewer.email,
        fullName: viewer.fullName,
        orgName: viewer.org.name,
        owner: viewer.role === "owner",
        planName: viewer.plan?.name ?? "—",
        credits: viewer.credits,
        totalCredits: total,
        hasCustomer: Boolean(viewer.org.stripe_customer_id),
        lastSignIn: viewer.user.last_sign_in_at ?? null,
        createdAt: viewer.user.created_at ?? null,
      }}
      billing={stripeEnabled()}
      payments={payments ?? []}
      sub={sub}
    />
  );
}

