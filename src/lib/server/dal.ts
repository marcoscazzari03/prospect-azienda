import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Data Access Layer: chi è l'utente e a quale organizzazione appartiene.

export type Plan = {
  id: string;
  name: string;
  kind: "free" | "pack" | "subscription" | "enterprise";
  price_cents: number;
  credits: number;
  credits_valid_months: number;
  max_users: number;
  max_active_searches: number;
  max_quantity_per_search: number;
  enrichment_per_run_max: number;
  features: string[];
  highlighted: boolean;
  sort: number;
};

export type Org = { id: string; name: string; plan_id: string; status: string; stripe_customer_id: string | null };

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getViewer = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("email, full_name, is_admin").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("role, organizations(id, name, plan_id, status, stripe_customer_id)")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const org = (membership?.organizations ?? null) as unknown as Org | null;
  if (!org) return null;
  const [{ data: balance }, { data: plan }] = await Promise.all([
    supabase.from("org_balances").select("available").eq("org_id", org.id).maybeSingle(),
    supabase.from("plans").select("*").eq("id", org.plan_id).maybeSingle(),
  ]);
  return {
    user,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    isAdmin: Boolean(profile?.is_admin),
    role: membership?.role as string,
    org,
    plan: plan as Plan,
    credits: balance?.available ?? 0,
  };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/accedi");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/app");
  return viewer;
}
