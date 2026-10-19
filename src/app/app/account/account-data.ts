import "server-only";
import { requireViewer } from "@/lib/server/dal";
import { validCreditsTotal } from "@/lib/server/credits";
import type { AccountData } from "./account-sections";

// Dati comuni delle pagine dell'account.
export async function loadAccount(): Promise<AccountData> {
  const viewer = await requireViewer();
  const total = await validCreditsTotal(viewer.org.id);
  return {
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
  };
}
