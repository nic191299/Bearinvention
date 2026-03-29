"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useCallback } from "react";
import { SafetyReport, SAFETY_TYPES, LatLng } from "@/lib/types";
import { initialSafetyReports } from "@/lib/mockData";
import { useGeolocation } from "@/lib/useGeolocation";
import Navbar from "@/components/Navbar";

const SafetyMap = dynamic(() => import("@/components/SafetyMap"), { ssr: false });

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m fa`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h fa`;
  return `${Math.floor(mins / 1440)}g fa`;
}

export default function SafetyPage() {
  const { position } = useGeolocation();
  const [reports, setReports] = useState<SafetyReport[]>(initialSafetyReports);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<SafetyReport["type"] | "all">("all");
  const [mobileView, setMobileView] = useState<"map" | "panel">("map");
  const [form, setForm] = useState({
    type: "dark_street" as SafetyReport["type"],
    message: "",
    author: "",
    timeOfDay: "night" as SafetyReport["timeOfDay"],
  });

  const submit = () => {
    if (!form.message.trim() || !form.author.trim()) return;
    setReports((prev) => [
      {
        id: `sr${Date.now()}`,
        type: form.type,
        position: { lat: position.lat + (Math.random() - 0.5) * 0.003, lng: position.lng + (Math.random() - 0.5) * 0.003 },
        message: form.message,
        author: form.author,
        timestamp: new Date(),
        upvotes: 0,
        confirmedSafe: 0,
        timeOfDay: form.timeOfDay,
      },
      ...prev,
    ]);
    setForm({ type: "dark_street", message: "", author: "", timeOfDay: "night" });
    setShowForm(false);
  };

  const handleUpvote = useCallback((id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r)));
  }, []);

  const handleConfirmSafe = useCallback((id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, confirmedSafe: r.confirmedSafe + 1 } : r)));
  }, []);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.type === filter);
  const sorted = [...filtered].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row md:pt-14 overflow-hidden">
        {/* Sidebar */}
        <div className={`${mobileView === "panel" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[400px] lg:w-[420px] h-full bg-gray-50 border-r border-gray-200 overflow-hidden z-10`}>
          <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 pb-24 md:pb-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[24px]">shield</span>
                <h1 className="text-lg font-bold">Sicurezza Quartieri</h1>
              </div>
              <p className="text-xs text-red-100 leading-relaxed">
                Segnala zone pericolose, strade buie o furti. Aiuta la community a muoversi in sicurezza.
                Le segnalazioni vengono usate per calcolare percorsi sicuri.
              </p>
            </div>

            {/* New report button */}
            <button
              onClick={() => setShowForm(!showForm)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition ${
                showForm ? "bg-gray-200 text-gray-600" : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{showForm ? "close" : "add_circle"}</span>
              {showForm ? "Chiudi" : "Nuova Segnalazione Sicurezza"}
            </button>

            {/* Form */}
            {showForm && (
              <div className="bg-red-50 rounded-2xl p-4 space-y-3 border border-red-100 animate-fade-in-up">
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(SAFETY_TYPES) as [SafetyReport["type"], typeof SAFETY_TYPES.theft][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, type: key })}
                      className={`chip ${form.type === key ? "chip-active text-white" : "bg-white text-gray-600"}`}
                      style={form.type === key ? { backgroundColor: config.color } : {}}
                    >
                      <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
                      {config.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  {(["day", "night", "both"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, timeOfDay: t })}
                      className={`chip flex-1 justify-center ${form.timeOfDay === t ? "bg-slate-800 text-white" : "bg-white text-gray-600"}`}
                    >
                      {t === "day" ? "Giorno" : t === "night" ? "Notte" : "Sempre"}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Il tuo nome"
                  className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Descrivi la situazione e dai consigli a chi passa di li..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <button
                  onClick={submit}
                  disabled={!form.message.trim() || !form.author.trim()}
                  className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition"
                >
                  Pubblica Segnalazione
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`chip ${filter === "all" ? "bg-slate-800 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
              >
                Tutte
              </button>
              {(Object.entries(SAFETY_TYPES) as [SafetyReport["type"], typeof SAFETY_TYPES.theft][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`chip ${filter === key ? "text-white" : "bg-white text-gray-600 border border-gray-200"}`}
                  style={filter === key ? { backgroundColor: config.color } : {}}
                >
                  <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
                  {config.label}
                </button>
              ))}
            </div>

            {/* Reports */}
            <div className="space-y-2">
              {sorted.map((report) => {
                const config = SAFETY_TYPES[report.type];
                return (
                  <div key={report.id} className="report-card animate-fade-in-up">
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: config.color + "18" }}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={{ color: config.color }}>
                          {config.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: config.color }}
                          >
                            {config.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                            {report.timeOfDay === "night" ? "Notte" : report.timeOfDay === "day" ? "Giorno" : "Sempre"}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(report.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-snug mt-1">{report.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-gray-400">{report.author}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleConfirmSafe(report.id)}
                              className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 transition font-medium"
                            >
                              <span className="material-symbols-outlined text-[14px]">verified</span>
                              Sicuro ora ({report.confirmedSafe})
                            </button>
                            <button
                              onClick={() => handleUpvote(report.id)}
                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition"
                            >
                              <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                              {report.upvotes}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Safety Map */}
        <div className={`flex-1 relative ${mobileView === "panel" ? "hidden md:block" : ""}`}>
          <SafetyMap
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            userPosition={position}
            reports={reports}
          />
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200 flex">
          <button
            onClick={() => setMobileView("map")}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium ${mobileView === "map" ? "text-red-600" : "text-gray-400"}`}
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            Mappa
          </button>
          <button
            onClick={() => setMobileView("panel")}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium ${mobileView === "panel" ? "text-red-600" : "text-gray-400"}`}
          >
            <span className="material-symbols-outlined text-[20px]">feed</span>
            Segnalazioni
          </button>
          <Link
            href="/"
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium text-gray-400"
          >
            <span className="material-symbols-outlined text-[20px]">directions_bus</span>
            Trasporti
          </Link>
        </div>
      </div>
    </div>
  );
}
