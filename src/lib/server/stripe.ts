import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan, Viewer } from "./dal";

let client: Stripe | null = null;
export function stripe() {
  const key = env.stripeSecretKey();
  if (!key) throw new Error("Stripe non configurato");
  client ??= new Stripe(key);
  return client;
}
export const stripeEnabled = () => Boolean(env.stripeSecretKey());

async function ensureCustomer(viewer: Viewer) {
  if (viewer.org.stripe_customer_id) return viewer.org.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: viewer.email,
    name: viewer.org.name,
    metadata: { org_id: viewer.org.id },
  });
  await createAdminClient().from("organizations").update({ stripe_customer_id: customer.id }).eq("id", viewer.org.id);
  return customer.id;
}

// Checkout per pacchetti (pagamento singolo) e abbonamenti (ricorrenti).
// I prezzi arrivano dal catalogo nel database: nessun ID prezzo da mantenere su Stripe.
export async function createCheckout(viewer: Viewer, plan: Plan) {
  const customer = await ensureCustomer(viewer);
  const metadata = { org_id: viewer.org.id, plan_id: plan.id };
  const base = `${env.appUrl()}/app/crediti`;
  const productData = { name: `${plan.name} · ${plan.credits} crediti`, metadata };
  const common = {
    customer,
    client_reference_id: viewer.org.id,
    success_url: `${base}?pagamento=ok`,
    cancel_url: `${base}?pagamento=annullato`,
    locale: "it" as const,
    billing_address_collection: "required" as const,
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto" as const, address: "auto" as const },
    metadata,
  };

  if (plan.kind === "pack") {
    return stripe().checkout.sessions.create({
      ...common,
      mode: "payment",
      invoice_creation: { enabled: true, invoice_data: { metadata } },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: plan.price_cents, product_data: productData } }],
    });
  }
  if (plan.kind === "subscription") {
    return stripe().checkout.sessions.create({
      ...common,
      mode: "subscription",
      subscription_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "eur", unit_amount: plan.price_cents, recurring: { interval: "month" }, product_data: productData },
        },
      ],
    });
  }
  throw new Error("Piano non acquistabile online");
}

export async function createPortal(viewer: Viewer) {
  const customer = await ensureCustomer(viewer);
  return stripe().billingPortal.sessions.create({ customer, return_url: `${env.appUrl()}/app/crediti` });
}
