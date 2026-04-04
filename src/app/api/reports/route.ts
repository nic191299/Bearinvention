import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getExpiryMinutes, isReportActive } from "@/lib/geo";
import { Report, ReportType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get("cityId");
  if (!cityId) return NextResponse.json({ reports: [] });

  const db = createServerSupabase();
  const { data, error } = await db
    .from("reports")
    .select("*")
    .eq("city_id", cityId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json({ reports: [] });
  }

  const active = (data || []).filter((r) =>
    isReportActive(r.confirms, r.denials, r.expires_at)
  );

  const reports: Report[] = active.map((r) => ({
    id: r.id,
    type: r.type as ReportType,
    position: { lat: r.lat, lng: r.lng },
    timestamp: new Date(r.created_at),
    confirms: r.confirms,
    denials: r.denials,
    expiresAt: new Date(r.expires_at),
    sessionId: r.session_id,
    upvotes: r.confirms,
  }));

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.cityId || !body?.type || body?.lat == null || body?.lng == null) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const { cityId, type, lat, lng, sessionId } = body;
  const expiryMs = getExpiryMinutes(type) * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  const db = createServerSupabase();
  const { data, error } = await db
    .from("reports")
    .insert({
      city_id: cityId,
      type,
      lat,
      lng,
      confirms: 0,
      denials: 0,
      session_id: sessionId || "anon",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Report insert error:", error);
    return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });
  }

  return NextResponse.json({ report: data });
}
