import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ombodpceqjsffbsumrww.supabase.co";
// Public anon key — safe to include in client code
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_GQxsVopSKZrhgLhdeqZ0zQ_Ey_VxQIL";

let _authClient: SupabaseClient | null = null;

export function createAuthClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server-side: return a fresh instance (won't be used for real auth)
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  if (!_authClient) {
    _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _authClient;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  level: string;
  reports_count: number;
  confirmations_given: number;
  city_id: string | null;
  trusted_contact_phone: string | null;
  trusted_contact_name: string | null;
}

export const LEVEL_CONFIG: Record<string, { label: string; icon: string; color: string; minScore: number; nextScore: number | null }> = {
  rookie:      { label: "Rookie",      icon: "emoji_nature",  color: "#6b7280", minScore: 0,    nextScore: 50   },
  contributor: { label: "Contributor", icon: "star",          color: "#f59e0b", minScore: 50,   nextScore: 200  },
  guardian:    { label: "Guardian",    icon: "shield",        color: "#3b82f6", minScore: 200,  nextScore: 500  },
  expert:      { label: "Expert",      icon: "verified",      color: "#8b5cf6", minScore: 500,  nextScore: 1000 },
  sentinel:    { label: "Sentinel",    icon: "military_tech", color: "#ef4444", minScore: 1000, nextScore: null },
};

export function getLevelProgress(score: number, level: string): number {
  const cfg = LEVEL_CONFIG[level];
  if (!cfg || !cfg.nextScore) return 100;
  const range = cfg.nextScore - cfg.minScore;
  return Math.min(100, Math.round(((score - cfg.minScore) / range) * 100));
}
