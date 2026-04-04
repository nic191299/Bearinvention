"use client";

import { useRef, useEffect, useState } from "react";
import { LatLng, Report, NewsAlert, REPORT_CONFIG, SAFETY_TYPES } from "@/lib/types";
import { getCityBounds } from "@/lib/cityData";
import type { CityInfo } from "@/lib/cityData";
import { TransitStep, parseTransitSteps, getVehicleIcon } from "@/lib/transitSteps";

// ─── News warning model ────────────────────────────────────────────────────────
interface NewsWarning { title: string; source: string; }

const CRIME_KEYWORDS = ["borseggio","furto","rapina","scippo","aggressione","violenza","stupro","molestie","accoltellamento","rissa","spaccio"];
function isNewsDangerous(n: NewsAlert): boolean {
  if (n.category === "crime") return true;
  const l = n.title.toLowerCase();
  return CRIME_KEYWORDS.some(k => l.includes(k));
}

// ─── Route danger scorer ───────────────────────────────────────────────────────
function haversineSimple(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DangerScore { score: number; label: string; color: string; icon: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcRouteDanger(route: any, reports: Report[], newsAlerts: NewsAlert[], threshold = 220): DangerScore {
  // Collect all path points from the route's legs/steps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathPts: Array<{ lat: () => number; lng: () => number }> = [];
  for (const leg of (route?.legs || [])) {
    for (const step of (leg?.steps || [])) {
      if (step.path) for (const p of step.path) pathPts.push(p);
    }
  }

  const near = (pos: LatLng): boolean => {
    for (const p of pathPts) {
      if (haversineSimple(pos.lat, pos.lng, p.lat(), p.lng()) < threshold) return true;
    }
    return false;
  };

  let score = 0;
  for (const r of reports) {
    if (near(r.position)) {
      score += r.type === "theft" || r.type === "harassment" ? 5
             : r.type === "danger" ? 3
             : r.type === "dark_street" ? 2 : 1;
    }
  }
  for (const n of newsAlerts) {
    if (isNewsDangerous(n) && n.position && near(n.position)) score += 8;
  }

  if (score === 0) return { score, label: "Sicuro", color: "#10b981", icon: "verified_user" };
  if (score < 6)   return { score, label: "Basso rischio", color: "#84cc16", icon: "shield" };
  if (score < 18)  return { score, label: "Attenzione", color: "#F0A500", icon: "warning" };
  return             { score, label: "Alto rischio", color: "#ef4444", icon: "dangerous" };
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface RoutePanelProps {
  origin: LatLng | null;
  destination: LatLng | null;
  originText: string;
  destinationText: string;
  mode: "WALKING" | "TRANSIT";
  routeInfo: { distance: string; duration: string } | null;
  onOriginSelect: (pos: LatLng, text: string) => void;
  onDestinationSelect: (pos: LatLng, text: string) => void;
  onModeChange: (mode: "WALKING" | "TRANSIT") => void;
  onUseMyLocation: () => void;
  onClear: () => void;
  apiLoaded: boolean;
  city?: CityInfo | null;
  reports?: Report[];
  newsAlerts?: NewsAlert[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directions?: any;
  selectedRouteIndex?: number;
  onRouteSelect?: (idx: number) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function RoutePanel({
  originText, destinationText, mode, routeInfo,
  onOriginSelect, onDestinationSelect, onModeChange,
  onUseMyLocation, onClear,
  apiLoaded, city, reports = [], newsAlerts = [], directions,
  selectedRouteIndex = 0, onRouteSelect,
}: RoutePanelProps) {
  const destRef        = useRef<HTMLInputElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const originPosRef   = useRef<LatLng | null>(null);
  const destPosRef     = useRef<LatLng | null>(null);

  const [editOrigin, setEditOrigin] = useState(false);
  const [reportWarnings, setReportWarnings] = useState<{ type: string; label: string; color: string; count: number }[]>([]);
  const [newsWarnings, setNewsWarnings] = useState<NewsWarning[]>([]);
  const [transitSteps, setTransitSteps] = useState<TransitStep[]>([]);
  const [showItinerary, setShowItinerary] = useState(false);

  // ── Autocomplete ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiLoaded || !window.google?.maps?.places) return;
    const b = city ? getCityBounds(city) : { lat1: 41.79, lng1: 12.35, lat2: 41.99, lng2: 12.65 };
    const bounds = new google.maps.LatLngBounds({ lat: b.lat1, lng: b.lng1 }, { lat: b.lat2, lng: b.lng2 });
    const opts = { bounds, fields: ["geometry", "name", "formatted_address"] };

    if (destRef.current) {
      const ac = new google.maps.places.Autocomplete(destRef.current, opts);
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        if (p.geometry?.location) handleDestSelect({ lat: p.geometry.location.lat(), lng: p.geometry.location.lng() }, p.name || p.formatted_address || "");
      });
    }
    if (originInputRef.current) {
      const ac = new google.maps.places.Autocomplete(originInputRef.current, opts);
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        if (p.geometry?.location) { handleOriginSelect({ lat: p.geometry.location.lat(), lng: p.geometry.location.lng() }, p.name || p.formatted_address || ""); setEditOrigin(false); }
      });
    }
  }, [apiLoaded, editOrigin, city]);

  // ── Safety analysis ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!routeInfo) { setReportWarnings([]); setNewsWarnings([]); return; }
    const o = originPosRef.current;
    const d = destPosRef.current;
    if (!o || !d) return;

    const pad = 0.012;
    const minLat = Math.min(o.lat, d.lat) - pad, maxLat = Math.max(o.lat, d.lat) + pad;
    const minLng = Math.min(o.lng, d.lng) - pad, maxLng = Math.max(o.lng, d.lng) + pad;
    const inBox = (p: LatLng) => p.lat >= minLat && p.lat <= maxLat && p.lng >= minLng && p.lng <= maxLng;

    const counts: Record<string, number> = {};
    for (const r of reports.filter(r => inBox(r.position))) counts[r.type] = (counts[r.type] || 0) + 1;
    const rw = Object.entries(counts).map(([type, count]) => ({
      type, count,
      label: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.label || type,
      color: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.color || "#6b7280",
    }));
    rw.sort((a, b) => (SAFETY_TYPES.includes(a.type as never) ? -1 : 1) - (SAFETY_TYPES.includes(b.type as never) ? -1 : 1));
    setReportWarnings(rw);

    const geocoded = newsAlerts.filter(n => isNewsDangerous(n) && n.position && inBox(n.position));
    const nonGeo   = newsAlerts.filter(n => isNewsDangerous(n) && !n.position).slice(0, 2);
    setNewsWarnings([...geocoded, ...nonGeo].slice(0, 4).map(n => ({
      title: n.title.length > 72 ? n.title.slice(0, 72) + "…" : n.title,
      source: n.source,
    })));
  }, [routeInfo, reports, newsAlerts]);

  // ── Transit steps ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!directions || mode !== "TRANSIT") { setTransitSteps([]); return; }
    setTransitSteps(parseTransitSteps(directions));
  }, [directions, mode]);

  const handleOriginSelect = (pos: LatLng, text: string) => { originPosRef.current = pos; onOriginSelect(pos, text); };
  const handleDestSelect   = (pos: LatLng, text: string) => { destPosRef.current = pos; onDestinationSelect(pos, text); };

  const hasAnySafety  = SAFETY_TYPES.some(t => reportWarnings.find(w => w.type === t));
  const isRouteSafe   = reportWarnings.length === 0 && newsWarnings.length === 0;
  const dangerLevel   = newsWarnings.length > 0 || hasAnySafety ? "high" : reportWarnings.length > 0 ? "medium" : "safe";
  const hasTransit    = transitSteps.some(s => s.mode === "TRANSIT");

  return (
    <div className="glass rounded-3xl shadow-xl border border-white/40 overflow-hidden">
      {/* ── Inputs ──────────────────────────────────────────────────────────── */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          {/* Dot connector */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#05C3B2", boxShadow: "0 0 0 3px rgba(5,195,178,0.25)" }} />
            <div className="w-px h-4 bg-gray-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
          </div>
          <div className="flex-1 space-y-1.5">
            {editOrigin ? (
              <input ref={originInputRef} type="text" placeholder="Da dove parti?" autoFocus
                className="w-full px-3 py-2.5 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05C3B2]" />
            ) : (
              <div onClick={() => setEditOrigin(true)}
                className="w-full px-3 py-2.5 bg-[#05C3B2]/10 rounded-2xl text-sm text-[#04A899] font-medium flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  {originText || "La mia posizione"}
                </span>
                <span className="material-symbols-outlined text-[14px] text-blue-400 shrink-0"
                  onClick={e => { e.stopPropagation(); onUseMyLocation(); setEditOrigin(false); }}>
                  gps_fixed
                </span>
              </div>
            )}
            <input ref={destRef} type="text" placeholder="Dove vuoi andare?"
              defaultValue={destinationText}
              onChange={e => { if (!e.target.value) destPosRef.current = null; }}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05C3B2] focus:bg-white" />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["WALKING", "TRANSIT"] as const).map(m => (
            <button key={m} onClick={() => onModeChange(m)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition-all"
              style={mode === m
                ? { backgroundColor: "#05C3B2", color: "white", boxShadow: "0 4px 14px rgba(5,195,178,0.35)" }
                : { backgroundColor: "#f1f5f9", color: "#6b7280" }}
            >
              <span className="material-symbols-outlined text-[15px]">
                {m === "WALKING" ? "directions_walk" : "directions_bus"}
              </span>
              {m === "WALKING" ? "A piedi" : "Mezzi pubblici"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Route info ──────────────────────────────────────────────────────── */}
      {routeInfo && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/30 pt-2.5">
          {/* ── Route alternatives ─────────────────────────────────────── */}
          {directions?.routes?.length > 1 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Scegli percorso</span>
                <button onClick={onClear} className="flex items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] text-red-500 hover:bg-red-50 font-semibold transition">
                  <span className="material-symbols-outlined text-[13px]">close</span>Annulla
                </button>
              </div>
              {(directions.routes as any[]).map((route: any, idx: number) => {
                const leg = route.legs?.[0];
                const danger = calcRouteDanger(route, reports, newsAlerts);
                const isSelected = idx === selectedRouteIndex;
                return (
                  <button key={idx} onClick={() => onRouteSelect?.(idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all text-left active:scale-95"
                    style={isSelected
                      ? { border: "1.5px solid #05C3B2", background: "rgba(5,195,178,0.06)" }
                      : { background: "#f8fafc", border: "1.5px solid transparent" }}
                  >
                    {/* Number badge */}
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                      style={{ backgroundColor: isSelected ? "#05C3B2" : "#e2e8f0", color: isSelected ? "white" : "#64748b" }}>
                      {idx + 1}
                    </div>
                    {/* Duration + distance */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-black text-gray-800">{leg?.duration?.text || "–"}</span>
                        <span className="text-[9px] text-gray-400">{leg?.distance?.text || ""}</span>
                      </div>
                    </div>
                    {/* Danger badge */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
                      style={{ backgroundColor: danger.color + "18" }}>
                      <span className="material-symbols-outlined text-[11px]" style={{ color: danger.color }}>{danger.icon}</span>
                      <span className="text-[9px] font-bold" style={{ color: danger.color }}>{danger.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Single route — show duration pill + cancel */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[15px]" style={{ color: "#05C3B2" }}>schedule</span>
                  <span className="text-sm font-bold text-gray-800">{routeInfo.duration}</span>
                </div>
                <span className="text-xs text-gray-400">{routeInfo.distance}</span>
                {/* Single route danger badge */}
                {directions?.routes?.[0] && (() => {
                  const d = calcRouteDanger(directions.routes[0], reports, newsAlerts);
                  return (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: d.color + "18" }}>
                      <span className="material-symbols-outlined text-[11px]" style={{ color: d.color }}>{d.icon}</span>
                      <span className="text-[9px] font-bold" style={{ color: d.color }}>{d.label}</span>
                    </div>
                  );
                })()}
              </div>
              <button onClick={onClear}
                className="flex items-center gap-0.5 px-2 py-1 rounded-xl text-[11px] text-red-500 hover:bg-red-50 font-semibold transition">
                <span className="material-symbols-outlined text-[13px]">close</span>
                Annulla
              </button>
            </div>
          )}

          {/* ── Transit itinerary ──────────────────────────────────────────── */}
          {hasTransit && (
            <div>
              {/* Line chips preview */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {transitSteps.map((step, i) => {
                  if (step.mode === "WALKING") {
                    return (
                      <div key={i} className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-gray-400 text-[13px]">directions_walk</span>
                        {i < transitSteps.length - 1 && <span className="material-symbols-outlined text-gray-300 text-[11px]">arrow_forward_ios</span>}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex items-center gap-0.5">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold shadow-sm"
                        style={{ backgroundColor: step.lineColor || "#3b82f6", color: step.lineTextColor || "#fff" }}>
                        <span className="material-symbols-outlined text-[12px]">{getVehicleIcon(step.vehicleType)}</span>
                        {step.lineShortName || step.lineName}
                      </div>
                      {i < transitSteps.length - 1 && <span className="material-symbols-outlined text-gray-300 text-[11px]">arrow_forward_ios</span>}
                    </div>
                  );
                })}
              </div>

              {/* Expand/collapse itinerary */}
              <button onClick={() => setShowItinerary(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-2xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#05C3B2]">route</span>
                  {showItinerary ? "Nascondi dettagli" : "Vedi itinerario dettagliato"}
                </span>
                <span className="material-symbols-outlined text-[16px] text-gray-400">
                  {showItinerary ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Detailed steps */}
              {showItinerary && (
                <div className="mt-2 space-y-1.5">
                  {transitSteps.map((step, i) => {
                    if (step.mode === "WALKING") {
                      return (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-2xl">
                          <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-gray-500 text-[16px]">directions_walk</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700">
                              A piedi · {step.duration}{step.distance ? ` · ${step.distance}` : ""}
                            </div>
                            {step.instruction && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">{step.instruction}</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    // TRANSIT step
                    return (
                      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
                        {/* Wait badge */}
                        {step.waitMin !== undefined && step.waitMin > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border-b border-orange-100">
                            <span className="material-symbols-outlined text-orange-400 text-[13px]">hourglass_top</span>
                            <span className="text-[10px] font-semibold text-orange-600">
                              Attesa al cambio: {step.waitMin} min
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2.5 p-3" style={{ borderLeft: `4px solid ${step.lineColor || "#3b82f6"}` }}>
                          {/* Vehicle icon */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: step.lineColor || "#3b82f6" }}>
                            <span className="material-symbols-outlined text-[17px]"
                              style={{ color: step.lineTextColor || "#fff" }}>
                              {getVehicleIcon(step.vehicleType)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Line + stops */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold" style={{ color: step.lineColor }}>
                                {step.lineShortName || step.lineName}
                              </span>
                              {step.lineName && step.lineShortName && step.lineName !== step.lineShortName && (
                                <span className="text-[10px] text-gray-400 truncate">{step.lineName}</span>
                              )}
                              <span className="text-[10px] text-gray-400">·</span>
                              <span className="text-[10px] text-gray-500">{step.numStops} fermate</span>
                              <span className="text-[10px] text-gray-400">·</span>
                              <span className="text-[10px] text-gray-500">{step.duration}</span>
                            </div>
                            {/* Stops */}
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                              <span className="material-symbols-outlined text-[11px]">radio_button_unchecked</span>
                              <span className="truncate">{step.departureStop}</span>
                              <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                              <span className="truncate">{step.arrivalStop}</span>
                            </div>
                            {/* Departure time */}
                            {step.departureTime && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="flex items-center gap-1 bg-[#05C3B2]/10 px-2 py-0.5 rounded-lg">
                                  <span className="material-symbols-outlined text-[#05C3B2] text-[11px]">schedule</span>
                                  <span className="text-[10px] font-bold text-[#05C3B2]">Parte {step.departureTime}</span>
                                </div>
                                {step.arrivalTime && (
                                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg">
                                    <span className="material-symbols-outlined text-gray-400 text-[11px]">flag</span>
                                    <span className="text-[10px] text-gray-500">Arriva {step.arrivalTime}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Safety ────────────────────────────────────────────────────── */}
          {isRouteSafe ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-2xl border border-green-100">
              <div className="w-7 h-7 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-green-500 text-[16px]">verified_user</span>
              </div>
              <span className="text-[11px] text-green-700 font-semibold">Nessuna segnalazione lungo il percorso</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Danger header */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border ${
                dangerLevel === "high" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-100"
              }`}>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  dangerLevel === "high" ? "bg-red-100" : "bg-amber-100"
                }`}>
                  <span className={`material-symbols-outlined text-[16px] ${dangerLevel === "high" ? "text-red-500" : "text-amber-500"}`}>
                    {dangerLevel === "high" ? "dangerous" : "warning"}
                  </span>
                </div>
                <span className={`text-[11px] font-bold ${dangerLevel === "high" ? "text-red-700" : "text-amber-700"}`}>
                  {dangerLevel === "high"
                    ? "Zona a rischio — considera percorso alternativo"
                    : `${reportWarnings.reduce((s, w) => s + w.count, 0)} segnalazioni lungo il percorso`}
                </span>
              </div>

              {/* News warnings */}
              {newsWarnings.map((nw, i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 rounded-2xl border border-red-100">
                  <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-red-500 text-[14px]">newspaper</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-red-400 uppercase tracking-wide">{nw.source}</div>
                    <div className="text-[10px] text-red-800 font-medium leading-snug mt-0.5">{nw.title}</div>
                  </div>
                </div>
              ))}

              {/* Report warnings */}
              {reportWarnings.slice(0, 3).map(w => (
                <div key={w.type} className="flex items-center gap-2.5 px-3 py-2 rounded-2xl" style={{ backgroundColor: w.color + "12" }}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: w.color + "25" }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: w.color }}>
                      {REPORT_CONFIG[w.type as keyof typeof REPORT_CONFIG]?.icon || "info"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: w.color }}>
                    {w.count}× {w.label}{SAFETY_TYPES.includes(w.type as never) ? " ⚠️" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
