import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ members: [] });

  const db = createServerSupabase();

  // Get family groups where user is owner or member
  const { data: ownedGroup } = await db.from("family_groups").select("id, invite_code, name").eq("owner_id", userId).maybeSingle();
  const { data: memberships } = await db.from("family_members").select("group_id").eq("user_id", userId);

  const groupIds = [
    ...(ownedGroup ? [ownedGroup.id] : []),
    ...(memberships || []).map((m) => m.group_id),
  ];

  if (groupIds.length === 0) return NextResponse.json({ members: [], group: null });

  // Get all members in these groups
  const { data: members } = await db
    .from("family_members")
    .select("user_id, display_name, avatar_color, sharing_enabled")
    .in("group_id", groupIds)
    .neq("user_id", userId);

  const memberUserIds = (members || []).map((m) => m.user_id);
  let locations: Record<string, { lat: number; lng: number; updated_at: string }> = {};

  if (memberUserIds.length > 0) {
    const { data: locs } = await db
      .from("family_locations")
      .select("user_id, lat, lng, updated_at")
      .in("user_id", memberUserIds);

    for (const loc of locs || []) {
      locations[loc.user_id] = { lat: loc.lat, lng: loc.lng, updated_at: loc.updated_at };
    }
  }

  const membersWithLocation = (members || []).map((m) => ({
    ...m,
    location: locations[m.user_id] || null,
  }));

  return NextResponse.json({ members: membersWithLocation, group: ownedGroup });
}
