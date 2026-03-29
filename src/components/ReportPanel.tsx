"use client";

import { useState } from "react";
import { TransportReport, TRANSPORT_TYPES, LatLng } from "@/lib/types";

interface ReportPanelProps {
  reports: TransportReport[];
  onAddReport: (report: Omit<TransportReport, "id" | "timestamp" | "upvotes">) => void;
  onUpvote: (id: string) => void;
  userPosition: LatLng;
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins}m fa`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h fa`;
  return `${Math.floor(mins / 1440)}g fa`;
}

export default function ReportPanel({ reports, onAddReport, onUpvote, userPosition }: ReportPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "delay" as TransportReport["type"],
    message: "",
    author: "",
    line: "",
  });

  const submit = () => {
    if (!form.message.trim() || !form.author.trim()) return;
    onAddReport({
      type: form.type,
      position: { lat: userPosition.lat + (Math.random() - 0.5) * 0.003, lng: userPosition.lng + (Math.random() - 0.5) * 0.003 },
      message: form.message,
      author: form.author,
      line: form.line || undefined,
    });
    setForm({ type: "delay", message: "", author: "", line: "" });
    setShowForm(false);
  };

  const sorted = [...reports].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">Segnalazioni Trasporti</h2>
          <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-pulse" />
            LIVE
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition ${
            showForm ? "bg-gray-200 text-gray-600" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">{showForm ? "close" : "add"}</span>
          {showForm ? "Chiudi" : "Segnala"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 rounded-2xl p-4 space-y-3 border border-blue-100 animate-fade-in-up">
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(TRANSPORT_TYPES) as [TransportReport["type"], typeof TRANSPORT_TYPES.delay][]).map(([key, config]) => (
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
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Il tuo nome"
            className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            value={form.line}
            onChange={(e) => setForm({ ...form, line: e.target.value })}
            placeholder="Linea (es. 64, metro A...)"
            className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Descrivi il problema..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <button
            onClick={submit}
            disabled={!form.message.trim() || !form.author.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Pubblica Segnalazione
          </button>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-2">
        {sorted.map((report) => {
          const config = TRANSPORT_TYPES[report.type];
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.label}
                    </span>
                    {report.line && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        Linea {report.line}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(report.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">{report.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">{report.author}</span>
                    <button
                      onClick={() => onUpvote(report.id)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                      {report.upvotes}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
