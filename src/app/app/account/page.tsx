import type { Metadata } from "next";
import { loadAccount } from "./account-data";
import { BusinessSection, ProfileSection } from "./account-sections";
import { requireViewer } from "@/lib/server/dal";
import { suggestionsVisible } from "@/lib/server/suggestions";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Il mio account" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  // «La tua attività» solo dove le ricerche consigliate sono accese (interruttore dell'Admin).
  const business = (await suggestionsVisible(viewer))
    ? (await createAdminClient().from("organizations").select("business_description, business_area").eq("id", viewer.org.id).maybeSingle()).data
    : null;
  return (
    <div className="grid gap-6">
      <ProfileSection account={await loadAccount()} />
      {business && <BusinessSection description={business.business_description} area={business.business_area} />}
    </div>
  );
}
