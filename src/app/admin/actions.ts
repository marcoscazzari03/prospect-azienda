"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/server/crypto";
import { finalizeSearch } from "@/lib/server/searches";
import type { Json } from "@/lib/supabase/database.types";

async function audit(actor: string, action: string, target: string, metadata: NonNullable<Json> = {}) {
  await createAdminClient().from("audit_log").insert({ actor_id: actor, action, target, metadata });
}

export async function adjustCredits(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ orgId: z.string().uuid(), delta: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0), reason: z.string().trim().min(3).max(200) }).parse(Object.fromEntries(form));
  const { error } = await createAdminClient().rpc("grant_credits", {
    p_org: p.orgId, p_delta: p.delta, p_kind: p.delta > 0 ? "grant" : "adjust", p_description: p.reason, p_actor: admin.user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/clienti/${p.orgId}`);
}

export async function setOrgStatus(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ orgId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(Object.fromEntries(form));
  await createAdminClient().from("organizations").update({ status: p.status }).eq("id", p.orgId);
  await audit(admin.user.id, `org.${p.status}`, p.orgId);
  revalidatePath(`/admin/clienti/${p.orgId}`);
}

export async function setOrgPlan(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ orgId: z.string().uuid(), planId: z.string().min(1).max(40) }).parse(Object.fromEntries(form));
  await createAdminClient().from("organizations").update({ plan_id: p.planId }).eq("id", p.orgId);
  await audit(admin.user.id, "org.plan", p.orgId, { plan: p.planId });
  revalidatePath(`/admin/clienti/${p.orgId}`);
}

export async function resolveReport(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ reportId: z.string().uuid(), approve: z.enum(["1", "0"]) }).parse(Object.fromEntries(form));
  await createAdminClient().rpc("refund_report", { p_report: p.reportId, p_approve: p.approve === "1", p_actor: admin.user.id });
  await audit(admin.user.id, p.approve === "1" ? "report.refund" : "report.reject", p.reportId);
  revalidatePath("/admin/segnalazioni");
}

export async function suppress(form: FormData) {
  const admin = await requireAdmin();
  const value = String(form.get("value") ?? "").trim().toLowerCase();
  if (!value) return;
  const db = createAdminClient();
  if (value.includes("@")) await db.from("suppression_list").upsert({ email_hash: sha256Hex(value), reason: "admin" }, { onConflict: "email_hash" });
  else await db.from("suppression_list").upsert({ domain_hash: sha256Hex(value), reason: "admin" }, { onConflict: "domain_hash" });
  await audit(admin.user.id, "suppression.add", value.includes("@") ? "email" : "domain");
  revalidatePath("/admin/segnalazioni");
}

export async function closeSearch(form: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().parse(form.get("searchId"));
  await finalizeSearch(id, "Chiusa dall'amministratore");
  await audit(admin.user.id, "search.close", id);
  revalidatePath("/admin/ricerche");
}

export async function updateCostRate(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ provider: z.string().min(1), unitCost: z.coerce.number().min(0).max(100) }).parse(Object.fromEntries(form));
  await createAdminClient().from("cost_rates").update({ unit_cost_eur: p.unitCost }).eq("provider", p.provider);
  await audit(admin.user.id, "cost_rate.update", p.provider, { unit_cost_eur: p.unitCost });
  revalidatePath("/admin/costi");
}

export async function updateCreditPrice(form: FormData) {
  const admin = await requireAdmin();
  const p = z.object({ type: z.enum(["generic", "personal"]), status: z.enum(["found_public", "validated", "unverified"]), credits: z.coerce.number().int().min(0).max(20) }).parse(Object.fromEntries(form));
  await createAdminClient().from("credit_prices").update({ credits: p.credits }).eq("email_type", p.type).eq("email_status", p.status);
  await audit(admin.user.id, "credit_price.update", `${p.type}/${p.status}`, { credits: p.credits });
  revalidatePath("/admin/costi");
}

// Budget mensile delle email trovate a pagamento (Icypeas). Vuoto = nessun limite.
export async function updateEnrichmentBudget(form: FormData) {
  const admin = await requireAdmin();
  const raw = String(form.get("budget") ?? "").trim();
  const budget = raw === "" ? null : z.coerce.number().int().min(0).max(1_000_000).parse(raw);
  const settings = createAdminClient().from("app_settings");
  // Senza riga = nessun limite.
  if (budget === null) await settings.delete().eq("key", "enrichment_monthly_budget");
  else await settings.upsert({ key: "enrichment_monthly_budget", value: budget, updated_at: new Date().toISOString(), updated_by: admin.user.id });
  await audit(admin.user.id, "settings.enrichment_budget", "enrichment_monthly_budget", { budget });
  revalidatePath("/admin/costi");
}
