"use client";

import { useState } from "react";
import { LatLng } from "@/lib/types";

interface QuickReportFabProps {
  userPosition: LatLng;
  onReport: (report: { type: string; category: "transport" | "safety"; message: string; position: LatLng }) => void;
}

const REPORT_OPTIONS = [
  { type: "delay", category: "transport" as const, icon: "schedule", label: "Ritardo", color: "#f59e0b", message: "Mezzo in ritardo alla fermata" },
  { type: "crowded", category: "transport" as const, icon: "groups", label: "Pieno", color: "#f97316", message: "Mezzo strapieno, impossibile salire" },
  { type: "cancelled", category: "transport" as const, icon: "cancel", label: "Cancellato", color: "#ef4444", message: "Corsa cancellata" },
  { type: "broken", category: "transport" as const, icon: "build", label: "Guasto", color: "#dc2626", message: "Mezzo o infrastruttura guasta" },
  { type: "dark_street", category: "safety" as const, icon: "dark_mode", label: "Buio", color: "#6b7280", message: "Strada poco illuminata" },
  { type: "danger", category: "safety" as const, icon: "warning", label: "Pericolo", color: "#ef4444", message: "Situazione pericolosa" },
  { type: "theft", category: "safety" as const, icon: "local_police", label: "Furto", color: "#dc2626", message: "Furto o borseggio segnalato" },
  { type: "harassment", category: "safety" as const, icon: "report", label: "Molestie", color: "#9333ea", message: "Persone moleste in zona" },
];

export default function QuickReportFab({ userPosition, onReport }: QuickReportFabProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const handleReport = (option: typeof REPORT_OPTIONS[0]) => {
    onReport({
      type: option.type,
      category: option.category,
      message: option.message,
      position: userPosition,
    });
    setSent(option.label);
    setTimeout(() => {
      setSent(null);
      setOpen(false);
    }, 1200);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="absolute bottom-24 md:bottom-6 right-4 z-40 flex flex-col items-end gap-3">
        {/* Sent confirmation */}
        {sent && (
          <div className="animate-fade-in-up bg-green-500 text-white rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="text-sm font-medium">{sent} segnalato!</span>
          </div>
        )}

        {/* Sub-icons grid - Waze style */}
        {open && !sent && (
          <div className="animate-fade-in-up grid grid-cols-4 gap-2 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 border border-gray-100">
            {REPORT_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleReport(option)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: option.color + "18", border: `2px solid ${option.color}40` }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: option.color }}>
                    {option.icon}
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-gray-600 leading-tight text-center">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB - Waze style */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 ${
            open
              ? "bg-gray-500 text-white"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">
            {open ? "close" : "campaign"}
          </span>
        </button>
      </div>
    </>
  );
}
