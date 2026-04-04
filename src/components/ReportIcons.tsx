"use client";

import { useState } from "react";
import { LatLng, ReportType } from "@/lib/types";

interface ReportIconsProps {
  userPosition: LatLng;
  onReport: (type: ReportType) => void;
}

const MOBILITY_ITEMS: { type: ReportType; icon: string; label: string; color: string }[] = [
  { type: "road_closed", icon: "block", label: "Strada chiusa", color: "#f97316" },
  { type: "danger", icon: "warning", label: "Pericolo", color: "#ef4444" },
  { type: "slowdown", icon: "speed", label: "Rallentamento", color: "#eab308" },
];

const SAFETY_ITEMS: { type: ReportType; icon: string; label: string; color: string }[] = [
  { type: "dark_street", icon: "dark_mode", label: "Strada buia", color: "#6366f1" },
  { type: "theft", icon: "local_police", label: "Furto/Borseggio", color: "#dc2626" },
  { type: "harassment", icon: "report", label: "Molestie", color: "#9333ea" },
];

export default function ReportIcons({ onReport }: ReportIconsProps) {
  const [sent, setSent] = useState<string | null>(null);
  const [safetyMode, setSafetyMode] = useState(false);

  const handle = (type: ReportType, label: string) => {
    onReport(type);
    setSent(label);
    setTimeout(() => setSent(null), 2000);
  };

  const items = safetyMode ? SAFETY_ITEMS : MOBILITY_ITEMS;

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5">
      <button
        onClick={() => setSafetyMode(!safetyMode)}
        className={`w-10 h-10 md:w-11 md:h-11 rounded-full shadow-lg flex items-center justify-center transition-all border-2 border-white active:scale-90 ${
          safetyMode ? "bg-indigo-600 text-white" : "glass text-gray-600 hover:bg-white"
        }`}
        title={safetyMode ? "Passa a Mobilità" : "Passa a Sicurezza"}
      >
        <span className="material-symbols-outlined text-[18px] md:text-[20px]">
          {safetyMode ? "directions_walk" : "shield"}
        </span>
      </button>

      <div className="w-6 h-0.5 rounded-full bg-gray-300" />

      {items.map((item) => (
        <button
          key={item.type}
          onClick={() => handle(item.type, item.label)}
          className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 hover:scale-105 border-2 border-white"
          style={{ backgroundColor: item.color }}
          title={item.label}
        >
          <span className="material-symbols-outlined text-white text-[22px] md:text-[26px]">{item.icon}</span>
          <span className="hidden md:group-hover:flex absolute left-full ml-2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap">
            {item.label}
          </span>
        </button>
      ))}

      {sent && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-green-500 text-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-1.5 whitespace-nowrap animate-fade-in-up text-sm font-medium">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Segnalato: {sent}
        </div>
      )}
    </div>
  );
}
