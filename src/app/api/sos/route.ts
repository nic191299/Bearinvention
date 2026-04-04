import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.lat || !body?.lng) return NextResponse.json({ error: "Missing coords" }, { status: 400 });

  const { lat, lng, type = "silent", userId, sessionId } = body;

  const db = createServerSupabase();
  const { error } = await db.from("sos_events").insert({
    user_id: userId || null,
    session_id: sessionId || "anon",
    lat,
    lng,
    type,
  });
  if (error) console.error("SOS log error:", error);

  return NextResponse.json({ ok: true });
}
