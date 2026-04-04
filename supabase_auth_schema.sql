-- ===================================================
-- BEARINVENTION - Auth & Scoring Schema
-- Esegui nel SQL Editor DOPO supabase_schema.sql
-- ===================================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  score INT DEFAULT 0,
  level TEXT DEFAULT 'rookie',
  reports_count INT DEFAULT 0,
  confirmations_given INT DEFAULT 0,
  city_id UUID REFERENCES cities(id),
  trusted_contact_phone TEXT,
  trusted_contact_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SOS events log
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  type TEXT DEFAULT 'silent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add user_id to existing tables (nullable, anonymous reports still work)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE report_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ===================================================
-- ROW LEVEL SECURITY
-- ===================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- SOS: own insert and read
CREATE POLICY "sos_own_insert" ON sos_events FOR INSERT WITH CHECK (true);
CREATE POLICY "sos_own_read" ON sos_events FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- ===================================================
-- TRIGGERS FOR SCORING
-- ===================================================

-- 1. Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. +5 points when user submits a report
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET score = score + 5, reports_count = reports_count + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_created ON reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_report();

-- 3. +1 for voter (confirm), +2 for report author
CREATE OR REPLACE FUNCTION public.handle_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id UUID;
BEGIN
  -- Voter gets +1 for confirming (not for denying)
  IF NEW.user_id IS NOT NULL AND NEW.vote = 1 THEN
    UPDATE public.profiles
    SET score = score + 1,
        confirmations_given = confirmations_given + 1
    WHERE id = NEW.user_id;
  END IF;

  -- Report author gets +2 per confirmation received
  IF NEW.vote = 1 THEN
    SELECT user_id INTO v_author_id FROM reports WHERE id = NEW.report_id;
    IF v_author_id IS NOT NULL AND v_author_id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
      UPDATE public.profiles SET score = score + 2 WHERE id = v_author_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vote_created ON report_votes;
CREATE TRIGGER on_vote_created
  AFTER INSERT ON report_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_vote();

-- 4. Auto-update level when score changes
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.level := CASE
    WHEN NEW.score >= 1000 THEN 'sentinel'
    WHEN NEW.score >= 500  THEN 'expert'
    WHEN NEW.score >= 200  THEN 'guardian'
    WHEN NEW.score >= 50   THEN 'contributor'
    ELSE 'rookie'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_score_change ON profiles;
CREATE TRIGGER on_score_change
  BEFORE UPDATE OF score ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_level();

-- ===================================================
-- INDEXES
-- ===================================================
CREATE INDEX IF NOT EXISTS profiles_score_idx ON profiles(score DESC);
CREATE INDEX IF NOT EXISTS sos_events_user_idx ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS sos_events_created_idx ON sos_events(created_at DESC);

-- ===================================================
-- LEADERBOARD VIEW
-- ===================================================
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.score,
    p.level,
    p.reports_count,
    p.confirmations_given,
    p.avatar_url
  FROM profiles p
  ORDER BY p.score DESC
  LIMIT 100;
