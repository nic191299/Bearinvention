"use client";

import { useState } from "react";
import { BusStop, CommunityReport } from "@/lib/types";
import { reportTypeConfig, bikeStations } from "@/lib/mockData";

interface SidebarProps {
  reports: CommunityReport[];
  selectedStop: BusStop | null;
  onAddReport: (report: Omit<CommunityReport, "id" | "timestamp" | "upvotes">) => void;
  onUpvote: (id: string) => void;
  onOpenChat: () => void;
  onToggleBikes: () => void;
  showBikes: boolean;
  onFindRoute: () => void;
  walkingRoute: [number, number][] | null;
  routeInfo: { distance: string; duration: string } | null;
  userPosition: { lat: number; lng: number };
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins} min fa`;
  return `${Math.floor(mins / 60)}h fa`;
}

export default function Sidebar({
  reports,
  selectedStop,
  onAddReport,
  onUpvote,
  onOpenChat,
  onToggleBikes,
  showBikes,
  onFindRoute,
  walkingRoute,
  routeInfo,
  userPosition,
}: SidebarProps) {
  const [tab, setTab] = useState<"reports" | "add">("reports");
  const [newReport, setNewReport] = useState({
    type: "delay" as CommunityReport["type"],
    message: "",
    author: "",
  });

  const submitReport = () => {
    if (!newReport.message.trim() || !newReport.author.trim()) return;
    onAddReport({
      type: newReport.type,
      lat: userPosition.lat + (Math.random() - 0.5) * 0.002,
      lng: userPosition.lng + (Math.random() - 0.5) * 0.002,
      message: newReport.message,
      author: newReport.author,
    });
    setNewReport({ type: "delay", message: "", author: "" });
    setTab("reports");
  };

  return (
    <div className="w-full lg:w-[380px] h-full bg-white flex flex-col shadow-xl z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-2xl">🚀</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">UrbanMove</h1>
            <p className="text-xs text-blue-100">Non restare bloccato alla fermata</p>
          </div>
        </div>

        {/* Selected stop info */}
        {selectedStop && (
          <div className="mt-3 bg-white/15 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Fermata selezionata</p>
                <p className="font-semibold text-sm">{selectedStop.name}</p>
                <p className="text-xs text-blue-100">
                  Linee: {selectedStop.lines.join(", ")}
                </p>
              </div>
              <button
                onClick={onFindRoute}
                className="bg-white text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
              >
                🚶 A piedi
              </button>
            </div>
            {walkingRoute && routeInfo && (
              <div className="mt-2 bg-white/10 rounded px-2 py-1.5 text-xs">
                📍 {routeInfo.distance} · ⏱️ {routeInfo.duration} a piedi
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-2 border-b border-gray-100 shrink-0">
        <button
          onClick={onOpenChat}
          className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
        >
          🤖 Chiedi all&apos;AI
        </button>
        <button
          onClick={onToggleBikes}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            showBikes
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🚲
        </button>
        <button
          onClick={() => setTab(tab === "add" ? "reports" : "add")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === "add"
              ? "bg-orange-100 text-orange-700 border border-orange-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ✏️
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {tab === "reports" ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">
                Segnalazioni Community
              </h2>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-live-pulse">
                LIVE
              </span>
            </div>

            {reports
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((report) => {
                const config = reportTypeConfig[report.type];
                return (
                  <div
                    key={report.id}
                    className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: config.color + "20", color: config.color }}
                      >
                        {config.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: config.color + "20", color: config.color }}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgo(report.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 leading-snug">{report.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">{report.author}</span>
                          <button
                            onClick={() => onUpvote(report.id)}
                            className="text-xs text-gray-400 hover:text-blue-600 transition flex items-center gap-1"
                          >
                            👍 {report.upvotes}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          /* Add report form */
          <div className="p-4 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Nuova Segnalazione</h2>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(reportTypeConfig) as [CommunityReport["type"], typeof reportTypeConfig.delay][]).map(
                  ([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setNewReport({ ...newReport, type: key })}
                      className={`text-xs px-3 py-1.5 rounded-lg transition ${
                        newReport.type === key
                          ? "ring-2 ring-offset-1 font-medium"
                          : "bg-gray-100 text-gray-600"
                      }`}
                      style={
                        newReport.type === key
                          ? { backgroundColor: config.color + "20", color: config.color }
                          : {}
                      }
                    >
                      {config.emoji} {config.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Il tuo nome</label>
              <input
                type="text"
                value={newReport.author}
                onChange={(e) => setNewReport({ ...newReport, author: e.target.value })}
                placeholder="es. Marco R."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Messaggio</label>
              <textarea
                value={newReport.message}
                onChange={(e) => setNewReport({ ...newReport, message: e.target.value })}
                placeholder="Cosa sta succedendo? (es. 'Bus 64 in ritardo di 15 min a Termini')"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              onClick={submitReport}
              disabled={!newReport.message.trim() || !newReport.author.trim()}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Pubblica Segnalazione
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 text-center shrink-0">
        <p className="text-[10px] text-gray-400">
          UrbanMove Demo · Brainwriting Cluster 1+2+3 · Smart Cities &amp; Urban Intelligence
        </p>
      </div>
    </div>
  );
}
