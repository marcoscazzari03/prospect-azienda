import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/server/dal";
import { toCsv } from "@/lib/domain/csv";
import { EXPORT_COLUMNS, LEAD_STAGES, flattenDelivery, type DeliveryRow } from "@/lib/domain/leads";
import { toXlsx } from "@/lib/server/xlsx";

// Export CSV o Excel dei lead dell'organizzazione (letti con la RLS dell'utente).
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const searchId = params.get("search");
  const emailType = params.get("tipo");
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";
  const stage = params.get("fase");
  const listId = params.get("lista");

  const supabase = await createClient();
  const inList =
    listId && /^[0-9a-f-]{36}$/i.test(listId)
      ? ((await supabase.from("lead_list_items").select("delivery_id").eq("list_id", listId).limit(50000)).data ?? []).map((x) => x.delivery_id)
      : null;
  const rows: DeliveryRow[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    let q = supabase
      .from("deliveries")
      .select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at, stage, notes")
      .eq("org_id", viewer.org.id)
      .order("delivered_at", { ascending: false })
      .range(from, from + 999);
    if (searchId) q = q.eq("search_id", searchId);
    if (emailType === "personal" || emailType === "generic") q = q.eq("email_type", emailType);
    if (stage && (LEAD_STAGES as readonly string[]).includes(stage)) q = q.eq("stage", stage);
    if (inList) q = q.in("id", inList.length ? inList.slice(0, 1000) : ["00000000-0000-0000-0000-000000000000"]);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: "errore di lettura" }, { status: 500 });
    rows.push(...((data ?? []) as DeliveryRow[]));
    if (!data || data.length < 1000) break;
  }

  await createAdminClient().from("exports").insert({
    org_id: viewer.org.id,
    user_id: viewer.user.id,
    format,
    rows: rows.length,
    filters: { search: searchId, tipo: emailType, fase: stage, lista: listId },
  });

  const date = new Date().toISOString().slice(0, 10);
  if (format === "xlsx") {
    const file = await toXlsx(rows.map(flattenDelivery), EXPORT_COLUMNS);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="lead-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const csv = toCsv(rows.map(flattenDelivery), EXPORT_COLUMNS);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
