"use client";

import { useState } from "react";
import { LatLng, REPORT_CONFIG } from "@/lib/types";

interface ReportIconsProps {
  userPosition: LatLng;
  onReport: (type: "road_closed" | "danger" | "slowdown") => void;
}

const ITEMS: { type: "road_closed" | "danger" | "slowdown"; icon: string; label: string; color: string }[] = [
  { type: "road_closed", icon: "block", label: "Strada chiusa", color: "#f97316" },
  { type: "danger", icon: "warning", label: "Pericolo", color: "#ef4444" },
  { type: "slowdown", icon: "speed", label: "Rallentamento", color: "#eab308" },
];

export default function ReportIcons({ onReport }: ReportIconsProps) {
  const [sent, setSent] = useState<string | null>(null);

  const handle = (type: "road_closed" | "danger" | "slowdown", label: string) => {
    onReport(type);
    setSent(label);
    setTimeout(() => setSent(null), 1500);
  };

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
      {ITEMS.map((item) => (
        <button
          key={item.type}
          onClick={() => handle(item.type, item.label)}
          className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 hover:scale-105 border-2 border-white"
          style={{ backgroundColor: item.color }}
          title={item.label}
        >
          <span className="material-symbols-outlined text-white text-[22px] md:text-[26px]">
            {item.icon}
          </span>
          {/* Tooltip on hover (desktop) */}
          <span className="hidden md:group-hover:flex absolute left-full ml-2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap">
            {item.label}
          </span>
        </button>
      ))}

      {/* Confirmation toast */}
      {sent && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-green-500 text-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-1.5 whitespace-nowrap animate-fade-in-up text-sm font-medium">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {sent}
        </div>
      )}
    </div>
  );
}
