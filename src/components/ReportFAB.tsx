"use client";

import { useState } from "react";
import { ReportType, REPORT_CONFIG } from "@/lib/types";

const ITEMS: { type: ReportType; emoji: string; label: string }[] = [
  { type: "road_closed",  emoji: "🚧", label: "Strada chiusa" },
  { type: "danger",       emoji: "⚠️", label: "Pericolo" },
  { type: "slowdown",     emoji: "🚦", label: "Rallentamento" },
  { type: "dark_street",  emoji: "🌑", label: "Zona buia" },
  { type: "theft",        emoji: "🎒", label: "Furto" },
  { type: "harassment",   emoji: "🚫", label: "Molestie" },
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
        <div
          className="fixed inset-0 z-[88] bg-black/40 animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Report grid popup */}
      {open && (
        <div
          className="fixed z-[89] animate-fade-in-up"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(340px, 92vw)",
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">
                Cosa segnali?
              </p>
            </div>
            {/* 3×2 grid */}
            <div className="grid grid-cols-3 gap-2 p-3">
              {ITEMS.map((item) => {
                const cfg = REPORT_CONFIG[item.type];
                return (
                  <button
                    key={item.type}
                    onClick={() => handle(item.type)}
                    className="flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl active:scale-90 transition-all"
                    style={{ backgroundColor: cfg.color + "15" }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {item.emoji}
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">
                      {item.label}
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
        className="fixed z-[90] flex items-center gap-1.5 bg-red-600 text-white rounded-full shadow-2xl px-4 h-12 active:scale-90 transition-transform font-bold text-sm"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          right: 16,
        }}
      >
        <span className="material-symbols-outlined text-[20px]">sos</span>
        SOS
      </button>

      {/* Main FAB — center bottom */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[90] active:scale-90 transition-all"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: open
            ? "#374151"
            : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
          boxShadow: open
            ? "0 8px 32px rgba(55,65,81,0.4)"
            : "0 8px 32px rgba(239,68,68,0.45)",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Inner icon rotates */}
        <span
          className="material-symbols-outlined text-white text-[28px] select-none"
          style={{
            display: "block",
            transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          {open ? "close" : "add_alert"}
        </span>
      </button>
    </>
  );
}
