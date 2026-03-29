"use client";

import { useState } from "react";
import { LatLng } from "@/lib/types";

interface QuickReportFabProps {
  userPosition: LatLng;
  onReport: (report: { type: string; category: "transport" | "safety"; message: string; position: LatLng }) => void;
}

const QUICK_OPTIONS = [
  { type: "dark_street", category: "safety" as const, icon: "dark_mode", label: "Strada buia", color: "#6b7280", message: "Strada poco illuminata in questa zona" },
  { type: "danger", category: "safety" as const, icon: "warning", label: "Pericolo", color: "#ef4444", message: "Situazione pericolosa segnalata in questa zona" },
  { type: "theft", category: "safety" as const, icon: "local_police", label: "Furto/Borseggio", color: "#dc2626", message: "Furto o tentativo di borseggio segnalato qui" },
  { type: "harassment", category: "safety" as const, icon: "report", label: "Molestie", color: "#9333ea", message: "Presenza di persone moleste in questa zona" },
  { type: "crowded", category: "transport" as const, icon: "groups", label: "Bus pieno", color: "#f97316", message: "Bus strapieno, impossibile salire" },
  { type: "delay", category: "transport" as const, icon: "schedule", label: "Bus in ritardo", color: "#f59e0b", message: "Bus in forte ritardo alla fermata" },
  { type: "cancelled", category: "transport" as const, icon: "cancel", label: "Mezzo cancellato", color: "#ef4444", message: "Corsa cancellata, mezzo non in servizio" },
  { type: "broken", category: "transport" as const, icon: "build", label: "Guasto", color: "#dc2626", message: "Mezzo o infrastruttura guasta" },
];

export default function QuickReportFab({ userPosition, onReport }: QuickReportFabProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const handleReport = (option: typeof QUICK_OPTIONS[0]) => {
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
    }, 1500);
  };

  return (
    <div className="absolute bottom-24 md:bottom-6 left-4 z-20">
      {/* Expanded menu */}
      {open && !sent && (
        <div className="mb-3 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-[280px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Segnalazione rapida</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mb-3">Segnala dalla tua posizione attuale</p>

            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">Sicurezza</p>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {QUICK_OPTIONS.filter((o) => o.category === "safety").map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleReport(option)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left hover:shadow-md transition bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ color: option.color }}
                    >
                      {option.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{option.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">Trasporti</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_OPTIONS.filter((o) => o.category === "transport").map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleReport(option)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left hover:shadow-md transition bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ color: option.color }}
                    >
                      {option.icon}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <div className="mb-3 animate-fade-in-up">
          <div className="bg-green-500 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="text-sm font-medium">Segnalazione &quot;{sent}&quot; inviata!</span>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
          open
            ? "bg-gray-600 text-white rotate-45"
            : "bg-red-500 text-white hover:bg-red-600 hover:shadow-2xl"
        }`}
      >
        <span className="material-symbols-outlined text-[26px]">
          {open ? "close" : "add_alert"}
        </span>
      </button>
    </div>
  );
}
