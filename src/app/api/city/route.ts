import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const db = createServerSupabase();
  const { data } = await db
    .from("cities")
    .select("id, name, lat, lng, country")
    .eq("name", name)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "City not found" }, { status: 404 });
  return NextResponse.json(data);
}
