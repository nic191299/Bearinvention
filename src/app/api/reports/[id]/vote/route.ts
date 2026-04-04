import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || body?.vote == null) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const { sessionId, vote } = body; // vote: +1 (confirm) or -1 (deny)
  const reportId = params.id;

  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: "Voto non valido" }, { status: 400 });
  }

  const db = createServerSupabase();

  // Check if already voted
  const { data: existing } = await db
    .from("report_votes")
    .select("id")
    .eq("report_id", reportId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Hai già votato", alreadyVoted: true }, { status: 409 });
  }

  // Insert vote
  const { error: voteError } = await db
    .from("report_votes")
    .insert({ report_id: reportId, session_id: sessionId, vote });

  if (voteError) {
    console.error("Vote insert error:", voteError);
    return NextResponse.json({ error: "Errore voto" }, { status: 500 });
  }

  // Update report counts
  const field = vote === 1 ? "confirms" : "denials";
  const { data: current } = await db
    .from("reports")
    .select("confirms, denials")
    .eq("id", reportId)
    .single();

  if (current) {
    await db
      .from("reports")
      .update({ [field]: (current[field as keyof typeof current] as number) + 1 })
      .eq("id", reportId);
  }

  return NextResponse.json({ success: true });
}
