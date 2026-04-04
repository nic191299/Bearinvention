"use client";

import { useState } from "react";
import { ReportType, REPORT_CONFIG } from "@/lib/types";

// Same Material Symbols icons used in the map controls
const ITEMS: { type: ReportType }[] = [
  { type: "road_closed" },
  { type: "danger" },
  { type: "slowdown" },
  { type: "dark_street" },
  { type: "theft" },
  { type: "harassment" },
];

interface ReportFABProps {
  onReport: (type: ReportType) => void;
  onSOSOpen: () => void;
}

export default function ReportFAB({ onReport, onSOSOpen }: ReportFABProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handle = (type: ReportType) => {
    onReport(type);
    setOpen(false);
    setToast(REPORT_CONFIG[type].label);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-green-500 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-2.5 animate-fade-in-up text-sm font-bold whitespace-nowrap pointer-events-none">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toast} segnalato
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-[88] bg-black/30 animate-fade-in" onClick={() => setOpen(false)} />
      )}

      {/* Report grid */}
      {open && (
        <div
          className="fixed z-[89] animate-fade-in-up"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(320px, 90vw)",
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-4 pt-3.5 pb-1 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Cosa segnali?</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {ITEMS.map(({ type }) => {
                const cfg = REPORT_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => handle(type)}
                    className="flex flex-col items-center gap-2 py-3.5 rounded-2xl active:scale-90 transition-all"
                    style={{ backgroundColor: cfg.color + "12" }}
                  >
                    {/* Rounded square tile — same style as map controls */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: cfg.color }}
                    >
                      <span className="material-symbols-outlined text-white text-[22px]">
                        {cfg.icon}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight px-1">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SOS pill — bottom right */}
      <button
        onClick={onSOSOpen}
        className="fixed z-[90] flex items-center gap-1.5 bg-red-600 text-white rounded-2xl shadow-2xl px-4 h-12 active:scale-90 transition-transform font-bold text-sm"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", right: 16 }}
      >
        <span className="material-symbols-outlined text-[20px]">emergency</span>
        SOS
      </button>

      {/* Main FAB — center bottom */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-[90] active:scale-90"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 60,
          height: 60,
          borderRadius: 20,           // rounded-2xl square tile, not circle
          background: open ? "#1e293b" : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
          boxShadow: open ? "0 8px 32px rgba(30,41,59,.45)" : "0 8px 32px rgba(239,68,68,.45)",
          transition: "background .2s, box-shadow .2s, border-radius .15s",
        }}
      >
        <span
          className="material-symbols-outlined text-white text-[26px] select-none"
          style={{
            display: "block",
            transition: "transform .25s cubic-bezier(.34,1.56,.64,1)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          add_alert
        </span>
      </button>
    </>
  );
}
