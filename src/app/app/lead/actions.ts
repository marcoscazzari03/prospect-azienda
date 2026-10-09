"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_STAGES } from "@/lib/domain/leads";

// Gestione dei lead da parte del cliente: stato, note e liste.
// Scritture con il service role, sempre limitate all'organizzazione di chi agisce.

export type LeadActionState = { error?: string; info?: string };

const uuid = z.string().uuid();

async function ownDeliveries(orgId: string, ids: string[]) {
  const { data } = await createAdminClient().from("deliveries").select("id").eq("org_id", orgId).in("id", ids);
  return (data ?? []).map((d) => d.id);
}

async function ownList(orgId: string, listId: string) {
  const { data } = await createAdminClient().from("lead_lists").select("id").eq("org_id", orgId).eq("id", listId).maybeSingle();
  return Boolean(data);
}

export async function setLeadStage(deliveryId: string, stage: string): Promise<LeadActionState> {
  const viewer = await requireViewer();
  const p = z.object({ id: uuid, stage: z.enum(LEAD_STAGES) }).safeParse({ id: deliveryId, stage });
  if (!p.success) return { error: "Dati non validi." };
  const { error } = await createAdminClient()
    .from("deliveries")
    .update({ stage: p.data.stage, stage_changed_at: new Date().toISOString() })
    .eq("id", p.data.id)
    .eq("org_id", viewer.org.id);
  return error ? { error: "Non salvato, riprova." } : {};
}

export async function saveLeadNotes(_: LeadActionState, form: FormData): Promise<LeadActionState> {
  const viewer = await requireViewer();
  const p = z.object({ id: uuid, notes: z.string().trim().max(2000) }).safeParse({ id: form.get("deliveryId"), notes: form.get("notes") ?? "" });
  if (!p.success) return { error: "Nota troppo lunga (massimo 2.000 caratteri)." };
  const { error } = await createAdminClient().from("deliveries").update({ notes: p.data.notes }).eq("id", p.data.id).eq("org_id", viewer.org.id);
  return error ? { error: "Non salvata, riprova." } : { info: "Nota salvata." };
}

export async function createList(_: LeadActionState, form: FormData): Promise<LeadActionState> {
  const viewer = await requireViewer();
  const p = z.string().trim().min(1, "Scrivi un nome").max(80).safeParse(form.get("name") ?? "");
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Nome non valido." };
  const { error } = await createAdminClient().from("lead_lists").insert({ org_id: viewer.org.id, name: p.data });
  if (error) return { error: error.code === "23505" ? "Esiste già una lista con questo nome." : "Lista non creata, riprova." };
  revalidatePath("/app/lead");
  return { info: `Lista «${p.data}» creata.` };
}

export async function deleteList(form: FormData) {
  const viewer = await requireViewer();
  const id = uuid.safeParse(form.get("listId"));
  if (!id.success) return;
  await createAdminClient().from("lead_lists").delete().eq("id", id.data).eq("org_id", viewer.org.id);
  revalidatePath("/app/lead");
}

// Aggiunge (o toglie) uno o più lead da una lista.
export async function setListMembership(listId: string, deliveryIds: string[], member: boolean): Promise<LeadActionState> {
  const viewer = await requireViewer();
  const p = z.object({ listId: uuid, ids: z.array(uuid).min(1).max(500) }).safeParse({ listId, ids: deliveryIds });
  if (!p.success) return { error: "Dati non validi." };
  if (!(await ownList(viewer.org.id, p.data.listId))) return { error: "Lista non trovata." };
  const ids = await ownDeliveries(viewer.org.id, p.data.ids);
  if (!ids.length) return { error: "Lead non trovati." };
  const db = createAdminClient();
  const { error } = member
    ? await db.from("lead_list_items").upsert(ids.map((delivery_id) => ({ list_id: p.data.listId, delivery_id })), { ignoreDuplicates: true })
    : await db.from("lead_list_items").delete().eq("list_id", p.data.listId).in("delivery_id", ids);
  if (error) return { error: "Non salvato, riprova." };
  revalidatePath("/app/lead");
  return { info: member ? `${ids.length} lead aggiunti alla lista.` : "Rimosso dalla lista." };
}
