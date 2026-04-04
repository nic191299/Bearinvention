"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { REPORT_CONFIG, SAFETY_TYPES } from "@/lib/types";
import { loadCityFromStorage } from "@/lib/cityData";
import { getSessionId } from "@/lib/session";
import { computeConfidence } from "@/lib/geo";
import type { DbReport, DbComment } from "@/lib/supabase";

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  strike: { icon: "front_hand", color: "#7c3aed", label: "Sciopero" },
  road_closure: { icon: "block", color: "#ef4444", label: "Chiusura" },
  event: { icon: "event", color: "#2563eb", label: "Evento" },
  transport: { icon: "directions_bus", color: "#f59e0b", label: "Trasporti" },
  crime: { icon: "local_police", color: "#dc2626", label: "Sicurezza" },
  general: { icon: "newspaper", color: "#6b7280", label: "Notizia" },
};

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  category: string;
}

function CommunityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cityId, setCityId] = useState<string | null>(null);
  const [cityName, setCityName] = useState("...");
  const [reports, setReports] = useState<DbReport[]>([]);
  const [comments, setComments] = useState<DbComment[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tab, setTab] = useState<"reports" | "comments" | "news">("reports");
  const [loading, setLoading] = useState(true);

  // Comment form
  const [content, setContent] = useState("");
  const [street, setStreet] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  // Vote tracking
  const [votedReports, setVotedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get city from URL param or localStorage
    const urlCity = searchParams.get("city");
    const storedCity = loadCityFromStorage();
    const name = urlCity || storedCity?.name || "Roma";
    setCityName(name);

    // Fetch city ID
    fetch(`/api/city?name=${encodeURIComponent(name)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.id) {
          setCityId(data.id);
        }
      });
  }, [searchParams]);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports?cityId=${cityId}`).then((r) => r.json()),
      fetch(`/api/comments?cityId=${cityId}`).then((r) => r.json()),
      fetch(`/api/news?city=${encodeURIComponent(cityName)}`).then((r) => r.json()),
    ]).then(([rData, cData, nData]) => {
      setReports(rData.reports || []);
      setComments(cData.comments || []);
      setNews(nData.alerts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [cityId, cityName]);

  const handleVote = async (reportId: string, vote: 1 | -1) => {
    const sid = getSessionId();
    if (votedReports.has(reportId)) return;
    setVotedReports((prev) => { const n = new Set(Array.from(prev)); n.add(reportId); return n; });
    await fetch(`/api/reports/${reportId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, vote }),
    });
    // Refresh reports
    if (cityId) {
      fetch(`/api/reports?cityId=${cityId}`)
        .then((r) => r.json())
        .then((d) => setReports(d.reports || []));
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !cityId) return;
    setPosting(true);
    setPostError("");
    const sid = getSessionId();
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId, content, street, authorName, sessionId: sid }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setContent("");
      setStreet("");
    } else {
      const err = await res.json();
      setPostError(err.error || "Errore");
    }
    setPosting(false);
  };

  const activeReports = reports.filter((r) => computeConfidence(r.confirms, r.denials) >= 0.2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <span className="material-symbols-outlined text-gray-600 text-[20px]">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7" />
            <div>
              <div className="text-sm font-bold text-gray-800">Community</div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">location_on</span>
                {cityName}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-[11px] text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full"
          >
            <span className="material-symbols-outlined text-[14px]">map</span>
            Mappa
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          {[
            { key: "reports", icon: "warning", label: "Segnalazioni", count: activeReports.length },
            { key: "comments", icon: "forum", label: "Commenti", count: comments.length },
            { key: "news", icon: "newspaper", label: "Notizie", count: news.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* REPORTS TAB */}
            {tab === "reports" && (
              <div className="space-y-3">
                {activeReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-[40px] block mb-2 opacity-30">check_circle</span>
                    <p className="text-sm">Nessuna segnalazione attiva a {cityName}</p>
                  </div>
                ) : (
                  activeReports.map((r) => {
                    const cfg = REPORT_CONFIG[r.type as keyof typeof REPORT_CONFIG];
                    const conf = computeConfidence(r.confirms, r.denials);
                    const ageMin = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
                    const isSafety = SAFETY_TYPES.includes(r.type as never);
                    const alreadyVoted = votedReports.has(r.id);
                    return (
                      <div key={r.id} className="report-card">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg?.color + "18" }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: cfg?.color }}>{cfg?.icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cfg?.color }}>
                                {cfg?.label}
                              </span>
                              {isSafety && (
                                <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">SICUREZZA</span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {ageMin < 60 ? `${ageMin} min fa` : `${Math.round(ageMin / 60)}h fa`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1 text-green-600">
                                <span className="material-symbols-outlined text-[12px]">thumb_up</span>
                                {r.confirms} conferme
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <span className="material-symbols-outlined text-[12px]">thumb_down</span>
                                {r.denials} smentite
                              </span>
                              <span className={`font-semibold ${conf > 1.2 ? "text-green-600" : conf < 0.5 ? "text-red-500" : "text-amber-500"}`}>
                                {Math.round(conf * 100)}% affidabile
                              </span>
                            </div>
                          </div>
                        </div>
                        {!alreadyVoted && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleVote(r.id, 1)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition"
                            >
                              <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                              C&apos;è ancora
                            </button>
                            <button
                              onClick={() => handleVote(r.id, -1)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition"
                            >
                              <span className="material-symbols-outlined text-[14px]">thumb_down</span>
                              Non c&apos;è più
                            </button>
                          </div>
                        )}
                        {alreadyVoted && (
                          <div className="mt-2 text-[10px] text-gray-400 text-center">Hai già votato</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* COMMENTS TAB */}
            {tab === "comments" && (
              <div className="space-y-3">
                {/* Post form */}
                <form onSubmit={handlePostComment} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-gray-800">Lascia un commento</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Il tuo nome (opzionale)"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      maxLength={40}
                      className="px-3 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Via / Zona (opzionale)"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      maxLength={80}
                      className="px-3 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <textarea
                    placeholder={`Condividi un'esperienza o osservazione su ${cityName}...`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={500}
                    rows={3}
                    required
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {postError && <p className="text-xs text-red-500">{postError}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{content.length}/500</span>
                    <button
                      type="submit"
                      disabled={posting || !content.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {posting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">send</span>}
                      Pubblica
                    </button>
                  </div>
                </form>

                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <span className="material-symbols-outlined text-[36px] block mb-2 opacity-30">forum</span>
                    <p className="text-sm">Nessun commento ancora. Sii il primo!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="report-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 text-[14px]">person</span>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{c.author_name}</div>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                            {c.street && (
                              <>
                                <span className="material-symbols-outlined text-[9px]">location_on</span>
                                <span>{c.street}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>{new Date(c.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* NEWS TAB */}
            {tab === "news" && (
              <div className="space-y-2">
                {news.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-[40px] block mb-2 opacity-30">newspaper</span>
                    <p className="text-sm">Nessuna notizia disponibile</p>
                  </div>
                ) : (
                  news.map((n) => {
                    const cfg = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.general;
                    return (
                      <a
                        key={n.id}
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="report-card flex items-start gap-3 group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: cfg.color + "18" }}>
                          <span className="material-symbols-outlined text-[18px]" style={{ color: cfg.color }}>{cfg.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition">{n.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.color + "18", color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="text-[9px] text-gray-400">{n.source}</span>
                            {n.date && <span className="text-[9px] text-gray-300">{new Date(n.date).toLocaleDateString("it-IT")}</span>}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 text-[16px] shrink-0 group-hover:text-blue-400 transition">open_in_new</span>
                      </a>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CommunityContent />
    </Suspense>
  );
}
