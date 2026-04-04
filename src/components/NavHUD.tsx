"use client";

import { useEffect, useState, useRef } from "react";
import { LatLng } from "@/lib/types";
import { haversine } from "@/lib/geo";
import { TransitStep, getVehicleIcon } from "@/lib/transitSteps";

const WALK_MPS = 1.3;         // m/s — average walking speed
const ARRIVE_THRESHOLD = 80;  // metres — consider step done

interface NavHUDProps {
  steps: TransitStep[];
  userPosition: LatLng;
  watching: boolean;
  routeActive: boolean;
}

function distTo(userPosition: LatLng, lat?: number, lng?: number): number {
  if (lat == null || lng == null) return Infinity;
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

export default function NavHUD({ steps, userPosition, watching, routeActive }: NavHUDProps) {
  const tick = useCountdown();
  const [currentIdx, setCurrentIdx] = useState(0);

  // Detect current step by proximity to each step's end
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

  if (!routeActive || steps.length === 0) return null;

  const cur  = steps[currentIdx];
  const next = steps[currentIdx + 1];

  // ── Walking math ──────────────────────────────────────────────────────────
  const remainingM = (cur.mode === "WALKING" && watching)
    ? distTo(userPosition, cur.endLat, cur.endLng)
    : (cur.totalDistanceM || 0);
  const remainingMin = Math.max(0, Math.round(remainingM / (WALK_MPS * 60)));
  const progressPct  = cur.totalDistanceM
    ? Math.min(100, Math.max(2, Math.round((1 - remainingM / cur.totalDistanceM) * 100)))
    : 0;

  // ── Transit countdown ─────────────────────────────────────────────────────
  const nowSec = Date.now() / 1000;
  const deptInMin = (cur.mode === "TRANSIT" && cur.departureTimestamp)
    ? Math.max(0, Math.round((cur.departureTimestamp - nowSec) / 60))
    : null;

  return (
    <div
      className="fixed z-[90] animate-fade-in-up"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
        left: 12,
        width: "min(200px, 50vw)",
      }}
    >
      {/* ── Journey strip ─────────────────────────────────────────────── */}
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
          // TRANSIT chip
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
        {/* Destination */}
        <div className="w-5 h-5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-500 text-[11px]">flag</span>
        </div>
      </div>

      {/* ── Current step card ─────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">

        {/* ── WALKING ── */}
        {cur.mode === "WALKING" && (
          <div className="p-3">
            <div className="flex items-center gap-2">
              {/* Walker icon */}
              <div className="w-10 h-10 bg-[#05C3B2]/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#05C3B2] text-[22px]">directions_walk</span>
              </div>

              {/* Bar + time */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">A piedi</span>
                  <span className="text-[12px] font-black text-[#05C3B2]">
                    {watching ? `${remainingMin} min` : cur.duration}
                  </span>
                </div>
                {/* Animated progress */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-[800ms] ease-out"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, #07DCC8, #05C3B2)",
                    }}
                  />
                </div>
                {cur.distance && (
                  <div className="text-[9px] text-gray-400 mt-0.5 truncate">
                    {watching && remainingM < 10000 ? `~${Math.round(remainingM)} m rimasti` : cur.distance}
                  </div>
                )}
              </div>

              {/* Next step badge */}
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
                  <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-400 text-[20px]">flag</span>
                  </div>
                )
              )}
            </div>

            {/* Next stop label */}
            {next?.mode === "TRANSIT" && (
              <div className="flex items-center gap-1 mt-2 px-2 py-1.5 bg-gray-50 rounded-xl">
                <span className="material-symbols-outlined text-[11px] text-gray-400">location_on</span>
                <span className="text-[9px] text-gray-500 truncate">
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
            {/* Line badge + name */}
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
                <div className="text-[11px] font-bold text-gray-700 truncate">{cur.departureStop}</div>
                <div className="text-[9px] text-gray-400 truncate">→ {cur.arrivalStop}</div>
              </div>
            </div>

            {/* Stops dot-track */}
            <div className="flex items-center gap-0.5 mb-2.5 px-1">
              {/* Departure dot */}
              <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
                style={{ backgroundColor: cur.lineColor || "#3b82f6" }} />
              {/* Track with stop dots */}
              <div className="flex-1 flex items-center">
                <div className="flex-1 h-0.5" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "50" }} />
                {Array.from({ length: Math.min((cur.numStops || 1) - 1, 6) }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "80" }} />
                    <div className="w-3 h-0.5" style={{ backgroundColor: (cur.lineColor || "#3b82f6") + "50" }} />
                  </div>
                ))}
              </div>
              {/* Arrival dot */}
              <div className="w-3 h-3 rounded-full shrink-0 border-2 bg-white shadow-sm"
                style={{ borderColor: cur.lineColor || "#3b82f6" }} />
            </div>

            {/* Time row */}
            <div className="flex items-center gap-1.5">
              {/* Departure countdown */}
              {deptInMin !== null ? (
                <div className="flex items-center gap-1 bg-[#05C3B2]/10 rounded-lg px-2 py-1 flex-1">
                  <span className="material-symbols-outlined text-[#05C3B2] text-[11px]">schedule</span>
                  <span className="text-[10px] font-bold text-[#04A899]">
                    {deptInMin <= 0 ? "In partenza" : `tra ${deptInMin} min`}
                  </span>
                  {cur.departureTime && (
                    <span className="text-[9px] text-[#05C3B2]/60 ml-auto">{cur.departureTime}</span>
                  )}
                </div>
              ) : cur.departureTime ? (
                <div className="flex items-center gap-1 bg-[#05C3B2]/10 rounded-lg px-2 py-1">
                  <span className="material-symbols-outlined text-[#05C3B2] text-[11px]">schedule</span>
                  <span className="text-[10px] font-bold text-[#04A899]">{cur.departureTime}</span>
                </div>
              ) : null}

              {/* Stops count */}
              {cur.numStops ? (
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg px-2 py-1">
                  <span className="material-symbols-outlined text-gray-400 text-[11px]">radio_button_checked</span>
                  <span className="text-[10px] text-gray-500">{cur.numStops} fermate</span>
                </div>
              ) : null}
            </div>

            {/* Arrival time */}
            {cur.arrivalTime && (
              <div className="flex items-center gap-1 mt-1.5 px-2 py-1 bg-gray-50 rounded-xl">
                <span className="material-symbols-outlined text-[10px] text-gray-400">flag</span>
                <span className="text-[9px] text-gray-500">
                  Arriva {cur.arrivalTime} a <span className="font-semibold">{cur.arrivalStop}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
