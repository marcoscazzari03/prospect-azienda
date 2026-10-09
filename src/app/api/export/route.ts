import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/server/dal";
import { toCsv } from "@/lib/domain/csv";
import { EXPORT_COLUMNS, flattenDelivery, type DeliveryRow } from "@/lib/domain/leads";

// Export CSV dei lead dell'organizzazione (letti con la RLS dell'utente).
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const searchId = params.get("search");
  const emailType = params.get("tipo");

  const supabase = await createClient();
  const rows: DeliveryRow[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    let q = supabase
      .from("deliveries")
      .select("id, search_id, data, email_address, email_type, email_status, credits, quality_score, delivered_at")
      .eq("org_id", viewer.org.id)
      .order("delivered_at", { ascending: false })
      .range(from, from + 999);
    if (searchId) q = q.eq("search_id", searchId);
    if (emailType === "personal" || emailType === "generic") q = q.eq("email_type", emailType);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: "errore di lettura" }, { status: 500 });
    rows.push(...((data ?? []) as DeliveryRow[]));
    if (!data || data.length < 1000) break;
  }

  await createAdminClient().from("exports").insert({
    org_id: viewer.org.id,
    user_id: viewer.user.id,
    format: "csv",
    rows: rows.length,
    filters: { search: searchId, tipo: emailType },
  });

  const csv = toCsv(rows.map(flattenDelivery), EXPORT_COLUMNS);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
