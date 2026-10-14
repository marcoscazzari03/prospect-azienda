"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer, type Plan } from "@/lib/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { defaultSearchName, nextRepeatAt, searchInputSchema, toTarget } from "@/lib/domain/search-input";
import { startSearch } from "@/lib/server/searches";
import { createCheckout, createPortal, stripeEnabled } from "@/lib/server/stripe";
import { RATE_LIMITS, SEARCH_RULES } from "@/lib/config";
import { SIGNAL_RULES } from "@/lib/domain/signals";

export type ActionState = { error?: string; info?: string };

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const ERRORS: [RegExp, (m: string) => string][] = [
  [/INSUFFICIENT_CREDITS:(\d+)/, (n) => `Crediti insufficienti: servono fino a ${n} crediti. Riduci la quantità o acquista crediti.`],
  [/QUANTITY_LIMIT:(\d+)/, (n) => `Il tuo piano permette fino a ${n} lead per ricerca.`],
  [/ACTIVE_LIMIT:(\d+)/, (n) => `Hai già ${n} ricerca/e in corso: attendi che finiscano o passa a un piano superiore.`],
  [/ORG_SUSPENDED/, () => "Account sospeso: contatta l'assistenza."],
];

export async function createSearch(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = searchInputSchema.safeParse({
    name: form.get("name") ?? "",
    industry: form.get("industry"),
    industryKeywords: lines(form.get("industryKeywords")),
    countries: form.getAll("countries").map(String),
    regions: lines(form.get("regions")),
    companySizes: form.getAll("companySizes").map(String),
    revenueRange: form.get("revenueRange") ?? "",
    roles: [...form.getAll("roles").map(String), ...lines(form.get("customRoles"))],
    keywords: lines(form.get("keywords")),
    excludeKeywords: lines(form.get("excludeKeywords")),
    notes: form.get("notes") ?? "",
    emailMode: form.get("emailMode"),
    quantity: form.get("quantity"),
    contactsPerCompany: form.get("contactsPerCompany") ?? 1,
    repeat: form.get("repeat") ?? "none",
    // Ricerca opportunità: il cliente sceglie il servizio, la regola dei segnali è nostra.
    signals: form.get("offer")
      ? { offer: String(form.get("offer")), codes: [], match: "any", jobFamilies: [] }
      : { codes: [], match: "any", jobFamilies: [] },
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const input = parsed.data;

  const db = createAdminClient();
  const since = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const recent = (h: number) =>
    db.from("searches").select("id", { count: "exact", head: true })
      .eq("org_id", viewer.org.id).is("repeat_of", null).gte("created_at", since(h));
  const [{ count: lastHour }, { count: lastDay }] = await Promise.all([recent(1), recent(24)]);
  if ((lastHour ?? 0) >= RATE_LIMITS.searchesPerHour || (lastDay ?? 0) >= RATE_LIMITS.searchesPerDay) {
    return { error: "Hai avviato molte ricerche in poco tempo: riprova più tardi." };
  }

  const { data, error } = await db
    .rpc("create_search", {
      p_user: viewer.user.id,
      p_org: viewer.org.id,
      p_name: input.name || defaultSearchName(input),
      p_target: toTarget(input),
      p_mode: input.emailMode,
      p_quantity: input.quantity,
      p_contacts_per_company: input.contactsPerCompany,
    })
    .single();
  if (error || !data) {
    const msg = error?.message ?? "";
    for (const [re, fmt] of ERRORS) {
      const m = msg.match(re);
      if (m) return { error: fmt(m[1] ?? "") };
    }
    return { error: "Non è stato possibile avviare la ricerca. Riprova." };
  }
  const searchId = (data as { id: string }).id;
  if (input.repeat !== "none") {
    await db
      .from("searches")
      .update({ repeat: input.repeat, next_repeat_at: nextRepeatAt(input.repeat, new Date()).toISOString() })
      .eq("id", searchId);
  }
  await startSearch(searchId);
  revalidatePath("/app", "layout");
  redirect(`/app/ricerche/${searchId}`);
}

const reportSchema = z.object({
  deliveryId: z.string().uuid(),
  reason: z.enum(["bounce", "wrong_role", "company_closed", "out_of_target", "duplicate", "wrong_signal", "other"]),
  note: z.string().trim().max(500).optional().default(""),
});

// Segnalazione di un lead: rimborso automatico entro le regole, altrimenti revisione.
export async function reportLead(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = reportSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Segnalazione non valida." };
  const { deliveryId, reason, note } = parsed.data;

  // Lettura con la RLS dell'utente: verifica che il lead sia suo.
  const supabase = await createClient();
  const { data: delivery } = await supabase.from("deliveries").select("id, search_id, delivered_at, signals:data->signals").eq("id", deliveryId).maybeSingle();
  if (!delivery) return { error: "Lead non trovato." };
  if (reason === "wrong_signal" && !(Array.isArray(delivery.signals) && delivery.signals.length)) {
    return { error: "Questo lead non è stato consegnato con un segnale." };
  }

  const ageDays = (Date.now() - new Date(delivery.delivered_at).getTime()) / 86_400_000;
  const window =
    reason === "bounce"
      ? SEARCH_RULES.bounceRefundWindowDays
      : reason === "wrong_signal"
        ? SIGNAL_RULES.refundWindowDays
        : SEARCH_RULES.autoRefundWindowDays;
  if (ageDays > window) return { error: `Le segnalazioni per questo motivo sono possibili entro ${window} giorni dalla consegna.` };

  const db = createAdminClient();
  const { count: todayReports } = await db.from("lead_reports").select("id", { count: "exact", head: true })
    .eq("org_id", viewer.org.id).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((todayReports ?? 0) >= RATE_LIMITS.reportsPerDay) {
    return { error: "Hai inviato molte segnalazioni oggi: riprova domani o scrivici." };
  }
  const { data: report, error } = await db
    .from("lead_reports")
    .insert({ delivery_id: deliveryId, org_id: viewer.org.id, reason, note, created_by: viewer.user.id })
    .select("id")
    .single();
  if (error || !report) return { error: "Hai già segnalato questo lead." };

  // Controllo del tetto e rimborso nella stessa transazione SQL (V7).
  const { data: refunded } = await db.rpc("auto_refund_report", { p_report: report.id, p_max_share: SEARCH_RULES.autoRefundMaxShare });
  if (refunded) {
    revalidatePath("/app", "layout");
    return { info: "Segnalazione accettata: i crediti del lead sono stati restituiti." };
  }
  return { info: "Segnalazione ricevuta: la verifichiamo entro 2 giorni lavorativi." };
}

export async function buyPlan(form: FormData) {
  const viewer = await requireViewer();
  if (!stripeEnabled()) redirect("/app/crediti?pagamento=non-attivo");
  const planId = String(form.get("planId") ?? "");
  const { data: plan } = await createAdminClient().from("plans").select("*").eq("id", planId).eq("active", true).maybeSingle();
  if (!plan || !["pack", "subscription"].includes(plan.kind)) redirect("/app/crediti");
  const session = await createCheckout(viewer, plan as unknown as Plan);
  redirect(session.url ?? "/app/crediti");
}

export async function openPortal() {
  const viewer = await requireViewer();
  if (!stripeEnabled()) redirect("/app/crediti?pagamento=non-attivo");
  const session = await createPortal(viewer);
  redirect(session.url);
}

// Ferma la ripetizione automatica di una ricerca.
export async function stopRepeat(form: FormData) {
  const viewer = await requireViewer();
  const id = z.string().uuid().safeParse(form.get("searchId"));
  if (!id.success) return;
  await createAdminClient().from("searches").update({ repeat: "none", next_repeat_at: null }).eq("id", id.data).eq("org_id", viewer.org.id);
  revalidatePath(`/app/ricerche/${id.data}`);
}
