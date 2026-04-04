import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get("cityId");
  if (!cityId) return NextResponse.json({ comments: [] });

  const db = createServerSupabase();
  const { data, error } = await db
    .from("comments")
    .select("*")
    .eq("city_id", cityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json({ comments: [] });
  }

  return NextResponse.json({ comments: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.cityId || !body?.content) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const { cityId, content, street, authorName, sessionId } = body;

  if (content.length > 500) {
    return NextResponse.json({ error: "Commento troppo lungo (max 500 caratteri)" }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data, error } = await db
    .from("comments")
    .insert({
      city_id: cityId,
      content: content.trim(),
      street: street?.trim() || null,
      author_name: authorName?.trim() || "Utente anonimo",
      session_id: sessionId || "anon",
      likes: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Comment insert error:", error);
    return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}
