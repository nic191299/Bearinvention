"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createAuthClient, LEVEL_CONFIG, UserProfile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthButtonProps {
  onProfileLoad?: (profile: UserProfile | null) => void;
}

export default function AuthButton({ onProfileLoad }: AuthButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createAuthClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => {
            const p = data as UserProfile | null;
            setProfile(p);
            onProfileLoad?.(p);
          });
      } else {
        onProfileLoad?.(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) { setProfile(null); onProfileLoad?.(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="w-9 h-9 rounded-xl bg-white/20 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="w-9 h-9 rounded-xl glass shadow flex items-center justify-center hover:bg-white transition"
        title="Accedi"
      >
        <span className="material-symbols-outlined text-gray-600 text-[18px]">person</span>
      </Link>
    );
  }

  const level = profile?.level || "rookie";
  const levelCfg = LEVEL_CONFIG[level];
  const initials = (profile?.full_name || user.email || "?").substring(0, 2).toUpperCase();

  return (
    <Link href="/profile" title={`${profile?.full_name || "Profilo"} · ${level}`}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg relative"
        style={{ backgroundColor: levelCfg.color }}
      >
        {initials}
        {(profile?.score || 0) > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[10px]">{levelCfg.icon}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
