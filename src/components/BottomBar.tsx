"use client";

import { useState } from "react";
import { ReportType, REPORT_CONFIG } from "@/lib/types";
import { LatLng } from "@/lib/types";
import type { UserProfile } from "@/lib/auth";

const REPORT_ITEMS: { type: ReportType; emoji: string }[] = [
  { type: "road_closed", emoji: "🚧" },
  { type: "danger", emoji: "⚠️" },
  { type: "slowdown", emoji: "🐌" },
  { type: "dark_street", emoji: "🌑" },
  { type: "theft", emoji: "👜" },
  { type: "harassment", emoji: "🚫" },
];

interface BottomBarProps {
  userPosition: LatLng;
  onReport: (type: ReportType) => void;
  userProfile?: UserProfile | null;
  userId?: string;
  onSOSOpen?: () => void;
}

export default function BottomBar({ onReport, onSOSOpen }: BottomBarProps) {
  const [lastSent, setLastSent] = useState<string | null>(null);

  const handleReport = (type: ReportType) => {
    onReport(type);
    const label = REPORT_CONFIG[type].label;
    setLastSent(label);
    setTimeout(() => setLastSent(null), 2000);
  };

  return (
    <>
      {/* Toast notification */}
      {lastSent && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in-up text-sm font-semibold whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Segnalato: {lastSent}
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/30 shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      >
        <div className="flex items-center gap-1 px-2 py-2">
          {/* Report icons */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {REPORT_ITEMS.map((item) => {
              const cfg = REPORT_CONFIG[item.type];
              return (
                <button
                  key={item.type}
                  onClick={() => handleReport(item.type)}
                  className="flex flex-col items-center gap-0.5 min-w-[52px] py-2 px-1 rounded-xl active:scale-90 transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: cfg.color }}
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                  </div>
                  <span className="text-[8px] text-gray-600 font-medium text-center leading-tight" style={{ maxWidth: 48 }}>
                    {cfg.label.split("/")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-200 mx-1 shrink-0" />

          {/* SOS */}
          <button
            onClick={onSOSOpen}
            className="flex flex-col items-center gap-0.5 min-w-[52px] py-2 px-1 rounded-xl active:scale-90 transition-transform shrink-0"
            style={{ touchAction: "manipulation" }}
          >
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[20px]">sos</span>
            </div>
            <span className="text-[8px] text-red-600 font-bold">SOS</span>
          </button>
        </div>
      </div>
    </>
  );
}
