import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/server/stripe";

// Webhook Stripe: fonte di verità per pagamenti, crediti e abbonamenti.
// Idempotente: ogni evento è registrato una sola volta (stripe_events) e
// ogni accredito ha un riferimento esterno univoco nel registro crediti.

const addMonths = (months: number) => new Date(Date.now() + months * 30.44 * 86_400_000).toISOString();

async function grant(orgId: string, planId: string, kind: "purchase" | "subscription", ref: string, description: string) {
  const db = createAdminClient();
  const { data: plan } = await db.from("plans").select("credits, credits_valid_months").eq("id", planId).single();
  if (!plan) throw new Error(`Piano sconosciuto: ${planId}`);
  const { error } = await db.rpc("grant_credits", {
    p_org: orgId,
    p_delta: plan.credits,
    p_kind: kind,
    p_description: description,
    p_external_ref: ref,
    p_expires_at: addMonths(plan.credits_valid_months),
  });
  if (error) throw error;
}

async function handle(event: Stripe.Event) {
  const db = createAdminClient();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "payment" || session.payment_status !== "paid") return;
    const orgId = session.metadata?.org_id;
    const planId = session.metadata?.plan_id;
    if (!orgId || !planId) return;
    await grant(orgId, planId, "purchase", `checkout:${session.id}`, "Acquisto pacchetto crediti");
    await db.from("payments").upsert(
      { org_id: orgId, plan_id: planId, kind: "pack", amount_cents: session.amount_total ?? 0, currency: session.currency ?? "eur", status: "paid", stripe_ref: session.id },
      { onConflict: "stripe_ref" },
    );
    // Chi compra un pacchetto ottiene i limiti del pacchetto, se non ha un abbonamento.
    const { data: sub } = await db.from("subscriptions").select("status").eq("org_id", orgId).maybeSingle();
    if (!sub || !["active", "trialing", "past_due"].includes(sub.status)) {
      await db.from("organizations").update({ plan_id: planId }).eq("id", orgId);
    }
    return;
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const details = invoice.parent?.subscription_details;
    const orgId = details?.metadata?.org_id;
    const planId = details?.metadata?.plan_id;
    if (!details || !orgId || !planId) return;
    await grant(orgId, planId, "subscription", `invoice:${invoice.id}`, "Crediti mensili dell'abbonamento");
    await db.from("payments").upsert(
      {
        org_id: orgId, plan_id: planId, kind: "subscription", amount_cents: invoice.amount_paid, currency: invoice.currency,
        status: "paid", stripe_ref: invoice.id, invoice_url: invoice.hosted_invoice_url ?? null,
      },
      { onConflict: "stripe_ref" },
    );
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const orgId = sub.metadata?.org_id;
    const planId = sub.metadata?.plan_id;
    if (!orgId || !planId) return;
    const periodEnd = sub.items.data[0]?.current_period_end;
    await db.from("subscriptions").upsert(
      {
        org_id: orgId, stripe_subscription_id: sub.id, plan_id: planId, status: sub.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end, updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );
    const active = ["active", "trialing", "past_due"].includes(sub.status);
    await db.from("organizations").update({ plan_id: active ? planId : "free" }).eq("id", orgId);
  }
}

export async function POST(request: Request) {
  const secret = env.stripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "non configurato" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "firma non valida" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: seen } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handle(event);
  } catch (e) {
    console.error("stripe webhook", event.type, e);
    return NextResponse.json({ error: "errore interno" }, { status: 500 }); // Stripe ritenta
  }
  await db.from("stripe_events").insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
