-- ============================================================
-- SAFEZ — Family sharing tables
-- Run this in Supabase SQL editor after the auth schema
-- ============================================================

-- Family groups (each user can own one group)
CREATE TABLE IF NOT EXISTS family_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'La mia famiglia',
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Family members (many users per group)
CREATE TABLE IF NOT EXISTS family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT 'Membro',
  avatar_color    TEXT NOT NULL DEFAULT '#3b82f6',
  sharing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Latest known location for each user (one row per user, upserted on every position update)
CREATE TABLE IF NOT EXISTS family_locations (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  accuracy   DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE family_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_locations ENABLE ROW LEVEL SECURITY;

-- family_groups: owner can do everything; members can read
CREATE POLICY "owner_all_groups" ON family_groups
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "member_read_group" ON family_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM family_members WHERE user_id = auth.uid())
  );

-- family_members: group owner can manage; members can read their own group
CREATE POLICY "owner_manage_members" ON family_members
  FOR ALL USING (
    group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "member_read_members" ON family_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM family_members WHERE user_id = auth.uid())
    OR
    group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "member_update_self" ON family_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "member_insert_self" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- family_locations: users update own location; family members can read each other
CREATE POLICY "user_upsert_own_location" ON family_locations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "family_read_locations" ON family_locations
  FOR SELECT USING (
    user_id IN (
      SELECT fm2.user_id
      FROM family_members fm1
      JOIN family_members fm2 ON fm1.group_id = fm2.group_id
      WHERE fm1.user_id = auth.uid()
      UNION
      SELECT fm.user_id
      FROM family_groups fg
      JOIN family_members fm ON fg.id = fm.group_id
      WHERE fg.owner_id = auth.uid()
    )
  );

-- ============================================================
-- Service-role bypass for API routes
-- (API routes use createServerSupabase which uses service_role key
--  and bypasses RLS, so the above policies are for direct client access)
-- ============================================================
