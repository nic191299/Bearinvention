import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ombodpceqjsffbsumrww.supabase.co";

// Lazy singleton for client-side
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    _client = createClient(SUPABASE_URL, key);
  }
  return _client;
}

// Named export for components that use it directly
export const supabase = {
  get client() { return getSupabase(); }
};

// Server-side client for API routes (creates fresh instance with current env)
export function createServerSupabase(): SupabaseClient {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(SUPABASE_URL, key);
}

export interface DbReport {
  id: string;
  city_id: string;
  type: string;
  lat: number;
  lng: number;
  confirms: number;
  denials: number;
  session_id: string;
  expires_at: string;
  created_at: string;
}

export interface DbComment {
  id: string;
  city_id: string;
  street: string | null;
  content: string;
  author_name: string;
  session_id: string;
  likes: number;
  created_at: string;
}

export interface DbCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}
