"use client";

import { useEffect, useState, useRef } from "react";
import { LatLng } from "@/lib/types";
import { haversine } from "@/lib/geo";
import { TransitStep, getVehicleIcon } from "@/lib/transitSteps";

const WALK_MPS = 1.3;
const ARRIVE_THRESHOLD = 80;

interface NavHUDProps {
  steps: TransitStep[];
  userPosition: LatLng;
  watching: boolean;
  routeActive: boolean;
  hidden?: boolean;
}

function distTo(userPosition: LatLng, lat?: number, lng?: number): number {
  if (lat == null || lng == null) return 0; // fallback 0 so times don't explode
  return haversine(userPosition.lat, userPosition.lng, lat, lng);
}

function useCountdown() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(i);
  }, []);
  return tick;
}

export default function NavHUD({ steps, userPosition, watching, routeActive, hidden }: NavHUDProps) {
  useCountdown();
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!steps.length) return;
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (distTo(userPosition, s.endLat, s.endLng) < ARRIVE_THRESHOLD) {
        idx = i + 1;
      } else break;
    }
    setCurrentIdx(Math.min(idx, steps.length - 1));
  }, [userPosition, steps]);

  if (!routeActive || steps.length === 0 || hidden) return null;

  const cur  = steps[currentIdx];
  const next = steps[currentIdx + 1];

  // ── Walking math ──────────────────────────────────────────────────────────
  const rawDist = (cur.mode === "WALKING" && watching)
    ? distTo(userPosition, cur.endLat, cur.endLng)
    : (cur.totalDistanceM ?? 0);
  // Guard against Infinity/NaN (when coords are 0/undefined)
  const remainingM  = isFinite(rawDist) && rawDist > 0 ? rawDist : (cur.totalDistanceM ?? 0);
  const remainingMin = Math.min(99, Math.max(0, Math.round(remainingM / (WALK_MPS * 60))));
  const progressPct  = cur.totalDistanceM && cur.totalDistanceM > 0
    ? Math.min(100, Math.max(2, Math.round((1 - remainingM / cur.totalDistanceM) * 100)))
    : 2;

  // ── Transit countdown ─────────────────────────────────────────────────────
  const nowSec = Date.now() / 1000;
  const rawDept = (cur.mode === "TRANSIT" && cur.departureTimestamp)
    ? Math.round((cur.departureTimestamp - nowSec) / 60)
    : null;
  // Clamp to sane range: if departure is more than 2 hours away the data is stale
  const deptInMin = rawDept !== null && rawDept >= 0 && rawDept < 120 ? rawDept : null;

  return (
    <div
      className="fixed z-[90] animate-fade-in-up"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
        left: 12,
        width: "min(200px, 50vw)",
      }}
    >
      {/* ── Journey strip ─────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 mb-2 flex-wrap">
        {steps.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          if (step.mode === "WALKING") {
            return (
              <div key={i} className="flex items-center gap-0.5">
                <div
                  className="w-5 h-5 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: done ? "#10b981" : active ? "#05C3B2" : "#f1f5f9",
                    boxShadow: active ? "0 0 0 2px rgba(5,195,178,0.3)" : undefined,
                  }}
                >
                  <span className={`material-symbols-outlined text-[10px] ${done || active ? "text-white" : "text-gray-400"}`}>
                    {done ? "check" : "directions_walk"}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-3 rounded-full ${done ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          }
          const bg = done ? "#10b981" : active ? (step.lineColor || "#05C3B2") : "#e5e7eb";
          const fg = done || active ? (step.lineTextColor || "#fff") : "#9ca3af";
          return (
            <div key={i} className="flex items-center gap-0.5">
              <div className="flex items-center gap-0.5 px-1.5 h-5 rounded-lg text-[9px] font-bold leading-none transition-all"
                style={{ backgroundColor: bg, color: fg }}>
                {done
                  ? <span className="material-symbols-outlined text-[10px]">check</span>
                  : <><span className="material-symbols-outlined text-[9px]">{getVehicleIcon(step.vehicleType)}</span>
                     <span>{(step.lineShortName || "").slice(0, 4)}</span></>
                }
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-3 rounded-full ${done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
        <div className="w-5 h-5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-500 text-[11px]">flag</span>
        </div>
      </div>

      {/* ── Current step card ─────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(6,24,38,0.93)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(5,195,178,0.18)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        {/* ── WALKING ── */}
        {cur.mode === "WALKING" && (
          <div className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#05C3B2]/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#05C3B2] text-[22px]">directions_walk</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>A piedi</span>
                  <span className="text-[12px] font-black text-[#05C3B2]">
                    {watching && remainingM > 0 ? `${remainingMin} min` : cur.duration}
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-[800ms] ease-out"
                    style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #07DCC8, #05C3B2)" }}
                  />
                </div>
                {cur.distance && (
                  <div className="text-[9px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {watching && remainingM > 0 ? `~${Math.round(remainingM)} m rimasti` : cur.distance}
                  </div>
                )}
              </div>
              {next && (
                next.mode === "TRANSIT" ? (
                  <div
                    className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl shrink-0 shadow-sm"
                    style={{ backgroundColor: next.lineColor || "#3b82f6" }}
                  >
                    <span className="material-symbols-outlined text-[14px]" style={{ color: next.lineTextColor || "#fff" }}>
                      {getVehicleIcon(next.vehicleType)}
                    </span>
                    <span className="font-black text-[9px] leading-none mt-0.5" style={{ color: next.lineTextColor || "#fff" }}>
                      {(next.lineShortName || "").slice(0, 5)}
                    </span>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                    <span className="material-symbols-outlined text-[20px]" style={{ color: "#ef4444" }}>flag</span>
                  </div>
                )
              )}
            </div>
            {next?.mode === "TRANSIT" && (
              <div className="flex items-center gap-1 mt-2 px-2 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="material-symbols-outlined text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>location_on</span>
                <span className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {next.departureStop}
                  {next.departureTime ? ` · parte ${next.departureTime}` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── TRANSIT ── */}
        {cur.mode === "TRANSIT" && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-sm shrink-0"
                style={{ backgroundColor: cur.lineColor || "#3b82f6" }}
              >
                <span className="material-symbols-outlined text-[15px]" style={{ color: cur.lineTextColor || "#fff" }}>
                  {getVehicleIcon(cur.vehicleType)}
                </span>
                <span className="font-black text-[13px]" style={{ color: cur.lineTextColor || "#fff" }}>
                  {cur.lineShortName || ""}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate" style={{ color: "rgba(255,255,255,0.9)" }}>{cur.departureStop}</div>
                <div className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>→ {cur.arrivalStop}</div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 mb-2.5 px-1">
              <div className="w-3 h-3 rounded-full shrink-0 border-2 shadow-sm"
                style={{ backgroundColor: cur.lineColor || "#05C3B2", borderColor: "rgba(255,255,255,0.2)" }} />
              <div className="flex-1 flex items-center">
                <div className="flex-1 h-0.5" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "50" }} />
                {Array.from({ length: Math.min((cur.numStops || 1) - 1, 6) }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "80" }} />
                    <div className="w-3 h-0.5" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "50" }} />
                  </div>
                ))}
              </div>
              <div className="w-3 h-3 rounded-full shrink-0 border-2 shadow-sm"
                style={{ backgroundColor: "rgba(6,24,38,0.9)", borderColor: cur.lineColor || "#05C3B2" }} />
            </div>

            <div className="flex items-center gap-1.5">
              {deptInMin !== null ? (
                <div className="flex items-center gap-1 bg-[#05C3B2]/10 rounded-lg px-2 py-1 flex-1">
                  <span className="material-symbols-outlined text-[#05C3B2] text-[11px]">schedule</span>
                  <span className="text-[10px] font-bold text-[#05C3B2]">
                    {deptInMin === 0 ? "In partenza" : `tra ${deptInMin} min`}
                  </span>
                  {cur.departureTime && (
                    <span className="text-[9px] text-[#05C3B2]/60 ml-auto">{cur.departureTime}</span>
                  )}
                </div>
              ) : cur.departureTime ? (
                <div className="flex items-center gap-1 bg-[#05C3B2]/10 rounded-lg px-2 py-1">
                  <span className="material-symbols-outlined text-[#05C3B2] text-[11px]">schedule</span>
                  <span className="text-[10px] font-bold text-[#05C3B2]">{cur.departureTime}</span>
                </div>
              ) : null}
              {cur.numStops ? (
                <div className="flex items-center gap-0.5 rounded-lg px-2 py-1" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <span className="material-symbols-outlined text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>radio_button_checked</span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>{cur.numStops} fermate</span>
                </div>
              ) : null}
            </div>

            {cur.arrivalTime && (
              <div className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="material-symbols-outlined text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>flag</span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Arriva {cur.arrivalTime} a <span className="font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>{cur.arrivalStop}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
