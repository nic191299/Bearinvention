"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient, LEVEL_CONFIG, UserProfile } from "@/lib/auth";
import { computeConfidence } from "@/lib/geo";
import { REPORT_CONFIG } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import type { DbReport, DbComment } from "@/lib/supabase";
import type { CityInfo } from "@/lib/cityData";

interface NewsItem {
  id: string; title: string; url: string; source: string; date: string; category: string;
}

const NEWS_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  strike: { icon: "front_hand", color: "#7c3aed", label: "Sciopero" },
  road_closure: { icon: "block", color: "#ef4444", label: "Chiusura" },
  event: { icon: "event", color: "#2563eb", label: "Evento" },
  transport: { icon: "directions_bus", color: "#f59e0b", label: "Trasporti" },
  crime: { icon: "local_police", color: "#dc2626", label: "Sicurezza" },
  general: { icon: "newspaper", color: "#6b7280", label: "Notizia" },
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  city: CityInfo | null;
  onCityChange: () => void;
}

export default function Sidebar({ open, onClose, city, onCityChange }: SidebarProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"community" | "news" | "famiglia">("community");
  const [reports, setReports] = useState<DbReport[]>([]);
  const [comments, setComments] = useState<DbComment[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joiningFamily, setJoiningFamily] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createAuthClient();
  const loaded = useRef(false);

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => setProfile(data as UserProfile));
        // Load family group
        supabase.from("family_groups").select("invite_code").eq("owner_id", user.id).maybeSingle()
          .then(({ data }) => { if (data) setFamilyCode(data.invite_code); });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data when sidebar opens or city changes
  useEffect(() => {
    if (!open || !city?.id || loaded.current) return;
    loaded.current = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports?cityId=${city.id}`).then(r => r.json()),
      fetch(`/api/comments?cityId=${city.id}`).then(r => r.json()),
      fetch(`/api/news?city=${encodeURIComponent(city.name)}`).then(r => r.json()),
    ]).then(([rd, cd, nd]) => {
      setReports(rd.reports || []);
      setComments(cd.comments || []);
      setNews(nd.alerts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, city?.id]);

  // Reset loaded flag when city changes
  useEffect(() => { loaded.current = false; }, [city?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    onClose();
  };

  const createFamily = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setFamilyError(null);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data, error } = await supabase.from("family_groups")
      .upsert({ owner_id: user.id, invite_code: code, name: `Famiglia di ${profile?.full_name || "Utente"}` }, { onConflict: "owner_id" })
      .select("invite_code").single();
    if (error) { setFamilyError("Errore creazione: " + error.message); return; }
    if (data) setFamilyCode(data.invite_code);
  };

  const joinFamily = async () => {
    if (!user || !inviteCode.trim()) return;
    setJoiningFamily(true);
    setFamilyError(null);
    const { data: group } = await supabase.from("family_groups").select("id, owner_id").eq("invite_code", inviteCode.trim().toUpperCase()).maybeSingle();
    if (!group) { setFamilyError("Codice non valido — controlla e riprova"); setJoiningFamily(false); return; }
    const { error } = await supabase.from("family_members").upsert(
      { group_id: group.id, user_id: user.id, display_name: profile?.full_name || "Membro", avatar_color: "#3b82f6" },
      { onConflict: "group_id,user_id" }
    );
    if (error) { setFamilyError("Errore: " + error.message); setJoiningFamily(false); return; }
    setJoiningFamily(false);
    setInviteCode("");
    setFamilyError(null);
  };

  const copyCode = () => {
    if (!familyCode) return;
    navigator.clipboard.writeText(familyCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInviteLink = () => {
    if (!familyCode) return;
    const url = `${window.location.origin}/family/join?code=${familyCode}`;
    if (navigator.share) {
      navigator.share({ title: "Unisciti alla mia famiglia su Salvo", url });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeReports = reports.filter(r => computeConfidence(r.confirms, r.denials) >= 0.2);
  const level = profile?.level || "rookie";
  const levelCfg = LEVEL_CONFIG[level];
  const initials = (profile?.full_name || user?.email || "?").substring(0, 2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-[360px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-4 text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #061826 0%, #0A2438 100%)" }}
        >
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#05C3B2" }}>
              <img src="/logo.svg" alt="Salvo" className="w-5 h-5" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <span className="text-lg font-black tracking-tight" style={{ color: "#05C3B2" }}>Salvo</span>
          </div>
          {city && (
            <button
              onClick={onCityChange}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl"
              style={{ background: "rgba(5,195,178,0.15)", color: "#05C3B2" }}
            >
              <span className="material-symbols-outlined text-[12px]">location_on</span>
              {city.name}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {[
            { key: "community", icon: "shield", label: "Community" },
            { key: "news", icon: "newspaper", label: "Notizie" },
            { key: "famiglia", icon: "family_restroom", label: "Famiglia" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className="flex-1 flex items-center justify-center gap-1 py-3 text-[11px] font-semibold border-b-2 transition"
              style={tab === t.key
                ? { borderColor: "#05C3B2", color: "#05C3B2" }
                : { borderColor: "transparent", color: "#9ca3af" }}
            >
              <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
              {t.label}
              {t.key === "community" && activeReports.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1 py-0.5 rounded-full font-bold">{activeReports.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#05C3B2", borderTopColor: "transparent", animation: "salvoSpin 0.8s linear infinite" }} />
            </div>
          ) : (
            <>
              {/* Community tab */}
              {tab === "community" && (
                <div className="p-3 space-y-3">
                  {/* Reports section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Segnalazioni attive</h3>
                      <Link href={`/community?city=${city?.name}`} onClick={onClose} className="text-[10px] text-[#05C3B2]">Vedi tutte →</Link>
                    </div>
                    {activeReports.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">
                        <span className="material-symbols-outlined block text-[28px] mb-1 opacity-30">check_circle</span>
                        Nessuna segnalazione attiva
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeReports.slice(0, 5).map((r) => {
                          const cfg = REPORT_CONFIG[r.type as keyof typeof REPORT_CONFIG];
                          const ageMin = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
                          return (
                            <div key={r.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg?.color + "20" }}>
                                <span className="material-symbols-outlined text-[14px]" style={{ color: cfg?.color }}>{cfg?.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-800">{cfg?.label}</div>
                                <div className="text-[10px] text-gray-400">{ageMin < 60 ? `${ageMin} min fa` : `${Math.round(ageMin / 60)}h fa`} · ✓{r.confirms} ✗{r.denials}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comments section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Commenti recenti</h3>
                      <Link href={`/community?city=${city?.name}`} onClick={onClose} className="text-[10px] text-[#05C3B2]">Vai →</Link>
                    </div>
                    {comments.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-xs">Nessun commento</div>
                    ) : (
                      <div className="space-y-2">
                        {comments.slice(0, 3).map((c) => (
                          <div key={c.id} className="p-2.5 bg-gray-50 rounded-xl">
                            <div className="text-xs font-semibold text-gray-700">{c.author_name}</div>
                            <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Family teaser */}
                  <div
                    className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#f3e8ff,#ede9fe)" }}
                    onClick={() => setTab("famiglia")}
                  >
                    <span className="material-symbols-outlined text-purple-500 text-[22px]">family_restroom</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-purple-800">Famiglia</div>
                      <div className="text-[10px] text-purple-500">{familyCode ? `Codice: ${familyCode}` : "Crea o unisciti a un gruppo →"}</div>
                    </div>
                    <span className="material-symbols-outlined text-purple-400 text-[16px]">chevron_right</span>
                  </div>
                </div>
              )}

              {/* News tab */}
              {tab === "news" && (
                <div className="p-3 space-y-2">
                  {news.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      <span className="material-symbols-outlined block text-[36px] mb-2 opacity-30">newspaper</span>
                      Nessuna notizia disponibile
                    </div>
                  ) : (
                    news.map((n) => {
                      const cfg = NEWS_ICONS[n.category] || NEWS_ICONS.general;
                      return (
                        <a
                          key={n.id}
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition group"
                          onClick={onClose}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: cfg.color + "20" }}>
                            <span className="material-symbols-outlined text-[14px]" style={{ color: cfg.color }}>{cfg.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-[#05C3B2]">{n.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.color + "18", color: cfg.color }}>{cfg.label}</span>
                              <span className="text-[9px] text-gray-400">{n.source}</span>
                            </div>
                          </div>
                        </a>
                      );
                    })
                  )}
                </div>
              )}

              {/* Famiglia tab */}
              {tab === "famiglia" && (
                <div className="p-4 space-y-4">
                  {!user ? (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-[40px] text-purple-200 block mb-3">family_restroom</span>
                      <p className="text-sm text-gray-500 mb-3">Accedi per usare la condivisione di posizione con la famiglia</p>
                      <Link href="/auth/login" onClick={onClose} className="inline-block px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "#05C3B2" }}>
                        Accedi →
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Error banner */}
                      {familyError && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                          <span className="material-symbols-outlined text-red-500 text-[14px]">error</span>
                          <span className="text-xs text-red-600">{familyError}</span>
                        </div>
                      )}

                      {/* My invite code */}
                      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e9d5ff" }}>
                        <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#f3e8ff,#ede9fe)" }}>
                          <div className="text-xs font-bold text-purple-800 mb-0.5">Il tuo codice famiglia</div>
                          <div className="text-[10px] text-purple-500">Condividilo con chi vuoi aggiungere</div>
                        </div>
                        <div className="px-4 py-3 bg-white">
                          {familyCode ? (
                            <>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1 text-center py-3 rounded-xl font-mono font-black text-2xl tracking-widest text-purple-700" style={{ background: "#f5f3ff", letterSpacing: "0.2em" }}>
                                  {familyCode}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={copyCode}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition"
                                  style={{ background: copied ? "#10b981" : "#ede9fe", color: copied ? "white" : "#7c3aed" }}
                                >
                                  <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
                                  {copied ? "Copiato!" : "Copia"}
                                </button>
                                <button
                                  onClick={shareInviteLink}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                                  style={{ background: "#7c3aed" }}
                                >
                                  <span className="material-symbols-outlined text-[14px]">share</span>
                                  Condividi
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={createFamily}
                              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              Crea il tuo gruppo famiglia
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Join by code */}
                      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
                        <div className="px-4 py-3 bg-gray-50">
                          <div className="text-xs font-bold text-gray-700">Entra in un gruppo</div>
                          <div className="text-[10px] text-gray-400">Inserisci il codice che ti hanno condiviso</div>
                        </div>
                        <div className="px-4 py-3 bg-white">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={inviteCode}
                              onChange={e => { setInviteCode(e.target.value.toUpperCase()); setFamilyError(null); }}
                              placeholder="es. AB12CD34"
                              maxLength={8}
                              className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-mono font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent uppercase tracking-widest"
                              style={{ "--tw-ring-color": "#7c3aed" } as React.CSSProperties}
                            />
                            <button
                              onClick={joinFamily}
                              disabled={joiningFamily || inviteCode.length < 6}
                              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
                              style={{ background: "#7c3aed" }}
                            >
                              {joiningFamily ? "..." : "Entra"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile footer */}
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-gray-50">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <Link href="/profile" onClick={onClose} className="shrink-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md relative"
                  style={{ backgroundColor: levelCfg.color }}
                >
                  {initials}
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: levelCfg.color }}>
                    <span className="material-symbols-outlined text-white text-[9px]">{levelCfg.icon}</span>
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href="/profile" onClick={onClose} className="block">
                  <div className="text-sm font-bold text-gray-800 truncate">{profile?.full_name || "Utente"}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: levelCfg.color }}>
                      {levelCfg.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{profile?.score || 0} pt</span>
                  </div>
                </Link>
              </div>

              {/* Settings + Logout */}
              <div className="flex gap-1">
                <Link href="/profile" onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition">
                  <span className="material-symbols-outlined text-gray-600 text-[18px]">settings</span>
                </Link>
                <button onClick={handleLogout} className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center hover:bg-red-200 transition">
                  <span className="material-symbols-outlined text-red-500 text-[18px]">logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-[20px]">person</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-600">Non hai un account?</div>
                <div className="text-[10px] text-gray-400">Guadagna punti e salva le preferenze</div>
              </div>
              <Link
                href="/auth/login"
                onClick={onClose}
                className="px-3 py-2 text-white text-xs font-bold rounded-xl transition"
                style={{ backgroundColor: "#05C3B2" }}
              >
                Accedi
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
