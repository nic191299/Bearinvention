"use client";

import { useEffect, useRef } from "react";
import { Report, NewsAlert, REPORT_CONFIG } from "@/lib/types";
import { TransitStep, getVehicleIcon, parseTransitSteps } from "@/lib/transitSteps";

// ── Danger scoring (same as RoutePanel) ──────────────────────────────────────

const CRIME_KEYWORDS = ["borseggio","furto","rapina","scippo","aggressione","violenza","stupro","molestie","accoltellamento","rissa","spaccio"];

function haversineSimple(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DangerResult { score: number; label: string; color: string; pct: number; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcDanger(route: any, reports: Report[], newsAlerts: NewsAlert[]): DangerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathPts: Array<{ lat: () => number; lng: () => number }> = [];
  for (const leg of (route?.legs || [])) {
    for (const step of (leg?.steps || [])) {
      if (step.path) for (const p of step.path) pathPts.push(p);
    }
  }
  const near = (pos: { lat: number; lng: number }) => {
    for (const p of pathPts) {
      if (haversineSimple(pos.lat, pos.lng, p.lat(), p.lng()) < 220) return true;
    }
    return false;
  };
  let score = 0;
  for (const r of reports) {
    if (near(r.position)) score += r.type === "theft" || r.type === "harassment" ? 5 : r.type === "danger" ? 3 : r.type === "dark_street" ? 2 : 1;
  }
  for (const n of newsAlerts) {
    if (!n.position) continue;
    const w = n.category === "crime" || CRIME_KEYWORDS.some(k => n.title.toLowerCase().includes(k)) ? 8
            : n.category === "transport" || n.category === "road_closure" ? 3 : 0;
    if (w > 0 && near(n.position)) score += w;
  }
  const pct = Math.min(100, Math.round((score / 30) * 100));
  if (score === 0) return { score, pct: 2, label: "Sicuro", color: "#10b981" };
  if (score < 6)   return { score, pct: Math.max(15, pct), label: "Basso rischio", color: "#84cc16" };
  if (score < 18)  return { score, pct: Math.max(45, pct), label: "Attenzione", color: "#F0A500" };
  return               { score, pct: Math.max(75, pct), label: "Alto rischio", color: "#ef4444" };
}

// ── Journey strip ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JourneyStrip({ route, mode }: { route: any; mode: string }) {
  const steps: TransitStep[] = parseTransitSteps({ routes: [route] }, 0);

  if (steps.length === 0) {
    // Walking only
    const leg = route?.legs?.[0];
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(5,195,178,0.15)" }}>
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#05C3B2" }}>directions_walk</span>
        </div>
        <div className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(5,195,178,0.3)" }} />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold" style={{ color: "#05C3B2" }}>{leg?.duration?.text || ""}</span>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{leg?.distance?.text || ""}</span>
        </div>
        <div className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(5,195,178,0.3)" }} />
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#ef4444" }}>flag</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Origin dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#05C3B2" }} />

      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          {/* Connector line */}
          <div className="h-0.5 w-3 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          {step.mode === "WALKING" ? (
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span className="material-symbols-outlined text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>directions_walk</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 px-2 h-7 rounded-xl shrink-0 text-[10px] font-black"
              style={{ backgroundColor: step.lineColor || "#05C3B2", color: step.lineTextColor || "#fff" }}>
              <span className="material-symbols-outlined text-[11px]">{getVehicleIcon(step.vehicleType)}</span>
              <span>{(step.lineShortName || "").slice(0, 5)}</span>
            </div>
          )}
        </div>
      ))}

      {/* Destination */}
      <div className="flex items-center gap-1">
        <div className="h-0.5 w-3 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
          <span className="material-symbols-outlined text-[13px]" style={{ color: "#ef4444" }}>flag</span>
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RouteBottomSheetProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directions: any;
  selectedRouteIndex: number;
  onRouteSelect: (idx: number) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  reports: Report[];
  newsAlerts: NewsAlert[];
  originText: string;
  destinationText: string;
  mode: "WALKING" | "TRANSIT";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RouteBottomSheet({
  directions, selectedRouteIndex, onRouteSelect, onConfirm, onDismiss,
  reports, newsAlerts, originText, destinationText, mode,
}: RouteBottomSheetProps) {
  const routes = directions?.routes || [];

  if (routes.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] animate-fade-in"
        style={{ background: "rgba(6,24,38,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[160] animate-slide-in-up"
        style={{
          background: "rgba(8,20,35,0.94)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderTop: "1px solid rgba(5,195,178,0.18)",
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -16px 64px rgba(0,0,0,0.5), 0 -1px 0 rgba(5,195,178,0.1) inset",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(5,195,178,0.7)" }}>
              Scegli il percorso
            </div>
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-bold truncate max-w-[130px]">{originText || "La mia posizione"}</span>
              <span className="material-symbols-outlined text-[14px]" style={{ color: "#05C3B2" }}>arrow_forward</span>
              <span className="text-sm font-bold truncate max-w-[130px]">{destinationText}</span>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ml-3"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <span className="material-symbols-outlined text-white/60 text-[18px]">close</span>
          </button>
        </div>

        {/* Route cards */}
        <div className="px-4 space-y-3 pb-4">
          {routes.map((route: any, idx: number) => {
            const leg = route.legs?.[0];
            const danger = calcDanger(route, reports, newsAlerts);
            const isSelected = idx === selectedRouteIndex;

            return (
              <button
                key={idx}
                onClick={() => onRouteSelect(idx)}
                className="w-full text-left rounded-3xl transition-all active:scale-[0.98] overflow-hidden"
                style={{
                  background: isSelected
                    ? "rgba(5,195,178,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: isSelected
                    ? "1.5px solid rgba(5,195,178,0.45)"
                    : "1.5px solid rgba(255,255,255,0.07)",
                  boxShadow: isSelected ? "0 0 24px rgba(5,195,178,0.12)" : "none",
                }}
              >
                <div className="p-4">
                  {/* Route number + duration row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      {/* Index badge */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                        style={{
                          background: isSelected ? "#05C3B2" : "rgba(255,255,255,0.1)",
                          color: isSelected ? "white" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-white font-black text-lg leading-none">{leg?.duration?.text || "–"}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                          {leg?.distance?.text || ""} · {mode === "WALKING" ? "a piedi" : "mezzi pubblici"}
                        </div>
                      </div>
                    </div>

                    {/* Danger label */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0"
                      style={{ background: danger.color + "20" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: danger.color }} />
                      <span className="text-[10px] font-bold" style={{ color: danger.color }}>
                        {danger.label}
                      </span>
                    </div>
                  </div>

                  {/* Journey strip */}
                  <div className="mb-3">
                    <JourneyStrip route={route} mode={mode} />
                  </div>

                  {/* Danger progress bar */}
                  <div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${danger.pct}%`,
                          background: `linear-gradient(90deg, #10b981, ${danger.color})`,
                          boxShadow: `0 0 8px ${danger.color}60`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Sicurezza percorso</span>
                      <span className="text-[9px] font-bold" style={{ color: danger.color }}>{danger.pct}%</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <div className="px-4 pb-4">
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2.5 active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, #07DCC8 0%, #05C3B2 100%)",
              boxShadow: "0 8px 32px rgba(5,195,178,0.45)",
            }}
          >
            <span className="material-symbols-outlined text-[20px]">navigation</span>
            Inizia navigazione
          </button>
        </div>
      </div>
    </>
  );
}
