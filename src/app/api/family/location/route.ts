import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.userId || body?.lat == null || body?.lng == null) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const { userId, lat, lng, accuracy } = body;
  const db = createServerSupabase();

  await db.from("family_locations").upsert(
    { user_id: userId, lat, lng, accuracy: accuracy || null, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true });
}
