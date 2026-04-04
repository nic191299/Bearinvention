-- ===================================================
-- BEARINVENTION - Schema Supabase
-- Incolla questo nel SQL Editor di Supabase
-- https://supabase.com/dashboard/project/ombodpceqjsffbsumrww/sql
-- ===================================================

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'IT',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('road_closed', 'danger', 'slowdown', 'dark_street', 'theft', 'harassment')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  confirms INT DEFAULT 0,
  denials INT DEFAULT 0,
  session_id TEXT NOT NULL DEFAULT 'anon',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Report votes (one per session per report)
CREATE TABLE IF NOT EXISTS report_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  vote INT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, session_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  street TEXT,
  content TEXT NOT NULL,
  author_name TEXT DEFAULT 'Utente anonimo',
  session_id TEXT NOT NULL DEFAULT 'anon',
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comment likes (one per session per comment)
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, session_id)
);

-- Enable Row Level Security
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: public crowdsourced app, allow all for anon
CREATE POLICY "cities_anon_all" ON cities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "reports_anon_all" ON reports FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "report_votes_anon_all" ON report_votes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "comments_anon_all" ON comments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "comment_likes_anon_all" ON comment_likes FOR ALL TO anon USING (true) WITH CHECK (true);

-- Also allow authenticated users
CREATE POLICY "cities_auth_all" ON cities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reports_auth_all" ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "report_votes_auth_all" ON report_votes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comments_auth_all" ON comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comment_likes_auth_all" ON comment_likes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS reports_city_id_idx ON reports(city_id);
CREATE INDEX IF NOT EXISTS reports_expires_at_idx ON reports(expires_at);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_city_id_idx ON comments(city_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at DESC);

-- Pre-populate Italian cities
INSERT INTO cities (name, country, lat, lng) VALUES
  ('Roma',    'IT', 41.9028, 12.4964),
  ('Milano',  'IT', 45.4654,  9.1859),
  ('Napoli',  'IT', 40.8518, 14.2681),
  ('Torino',  'IT', 45.0703,  7.6869),
  ('Palermo', 'IT', 38.1157, 13.3615),
  ('Genova',  'IT', 44.4056,  8.9463),
  ('Bologna', 'IT', 44.4949, 11.3426),
  ('Firenze', 'IT', 43.7696, 11.2558),
  ('Bari',    'IT', 41.1171, 16.8719),
  ('Catania', 'IT', 37.5079, 15.0830),
  ('Venezia', 'IT', 45.4408, 12.3155),
  ('Verona',  'IT', 45.4384, 10.9916)
ON CONFLICT (name) DO NOTHING;
