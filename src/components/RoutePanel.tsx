"use client";

import { useRef, useEffect, useState } from "react";
import { LatLng, Report, NewsAlert, REPORT_CONFIG, SAFETY_TYPES } from "@/lib/types";
import { getCityBounds } from "@/lib/cityData";
import type { CityInfo } from "@/lib/cityData";

interface NewsWarning {
  title: string;
  source: string;
  category: NewsAlert["category"];
}

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
}

const NEWS_CATEGORY_LABEL: Record<string, string> = {
  crime: "Episodio segnalato nelle notizie",
  road_closure: "Chiusura strada segnalata",
  strike: "Sciopero in zona",
  event: "Evento in zona",
};

const NEWS_CRIME_KEYWORDS = [
  "borseggio", "furto", "rapina", "scippo", "aggressione",
  "violenza", "stupro", "molestie", "accoltellamento", "rissa", "spaccio",
];

function isNewsDangerous(alert: NewsAlert): boolean {
  if (alert.category === "crime") return true;
  const lower = alert.title.toLowerCase();
  return NEWS_CRIME_KEYWORDS.some(k => lower.includes(k));
}

export default function RoutePanel({
  originText,
  destinationText,
  mode,
  routeInfo,
  onOriginSelect,
  onDestinationSelect,
  onModeChange,
  onUseMyLocation,
  onClear,
  apiLoaded,
  city,
  reports = [],
  newsAlerts = [],
}: RoutePanelProps) {
  const destRef = useRef<HTMLInputElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const [editOrigin, setEditOrigin] = useState(false);
  const [reportWarnings, setReportWarnings] = useState<{ type: string; label: string; color: string; count: number }[]>([]);
  const [newsWarnings, setNewsWarnings] = useState<NewsWarning[]>([]);

  // Refs to track current positions
  const originRef = useRef<LatLng | null>(null);
  const destPosRef = useRef<LatLng | null>(null);

  // Autocomplete setup
  useEffect(() => {
    if (!apiLoaded || !window.google?.maps?.places) return;
    const b = city ? getCityBounds(city) : { lat1: 41.79, lng1: 12.35, lat2: 41.99, lng2: 12.65 };
    const bounds = new google.maps.LatLngBounds({ lat: b.lat1, lng: b.lng1 }, { lat: b.lat2, lng: b.lng2 });
    const opts = { bounds, fields: ["geometry", "name", "formatted_address"] };

    if (destRef.current) {
      const ac = new google.maps.places.Autocomplete(destRef.current, opts);
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.geometry?.location)
          handleDestSelect(
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            place.name || place.formatted_address || ""
          );
      });
    }
    if (originInputRef.current) {
      const ac = new google.maps.places.Autocomplete(originInputRef.current, opts);
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          handleOriginSelect(
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            place.name || place.formatted_address || ""
          );
          setEditOrigin(false);
        }
      });
    }
  }, [apiLoaded, editOrigin, city]);

  // Safety analysis: user reports + news
  useEffect(() => {
    if (!routeInfo) { setReportWarnings([]); setNewsWarnings([]); return; }
    const originPos = originRef.current;
    const destPos = destPosRef.current;
    if (!originPos || !destPos) { setReportWarnings([]); setNewsWarnings([]); return; }

    const pad = 0.012; // ~1.3km padding around route bbox
    const minLat = Math.min(originPos.lat, destPos.lat) - pad;
    const maxLat = Math.max(originPos.lat, destPos.lat) + pad;
    const minLng = Math.min(originPos.lng, destPos.lng) - pad;
    const maxLng = Math.max(originPos.lng, destPos.lng) + pad;

    const inBox = (pos: LatLng) =>
      pos.lat >= minLat && pos.lat <= maxLat && pos.lng >= minLng && pos.lng <= maxLng;

    // ── User reports ──────────────────────────────────────────
    const near = reports.filter(r => inBox(r.position));
    const counts: Record<string, number> = {};
    for (const r of near) counts[r.type] = (counts[r.type] || 0) + 1;
    const rw = Object.entries(counts).map(([type, count]) => ({
      type,
      label: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.label || type,
      color: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.color || "#6b7280",
      count,
    }));
    rw.sort((a, b) => (SAFETY_TYPES.includes(a.type as never) ? -1 : 1) - (SAFETY_TYPES.includes(b.type as never) ? -1 : 1));
    setReportWarnings(rw);

    // ── News-based dangers ────────────────────────────────────
    // 1. Geocoded news with real position in route bbox
    const geocodedDangers = newsAlerts
      .filter(n => isNewsDangerous(n) && n.position && inBox(n.position))
      .map(n => ({
        title: n.title.length > 70 ? n.title.slice(0, 70) + "…" : n.title,
        source: n.source,
        category: n.category,
      }));

    // 2. Non-geocoded crime news: treat as city-wide warning (show max 2)
    const nonGeocodedDangers = newsAlerts
      .filter(n => isNewsDangerous(n) && !n.position)
      .slice(0, 2)
      .map(n => ({
        title: n.title.length > 70 ? n.title.slice(0, 70) + "…" : n.title,
        source: n.source,
        category: n.category,
      }));

    const allNews = [...geocodedDangers, ...nonGeocodedDangers].slice(0, 4);
    setNewsWarnings(allNews);
  }, [routeInfo, reports, newsAlerts]);

  const handleOriginSelect = (pos: LatLng, text: string) => {
    originRef.current = pos;
    onOriginSelect(pos, text);
  };
  const handleDestSelect = (pos: LatLng, text: string) => {
    destPosRef.current = pos;
    onDestinationSelect(pos, text);
  };

  const hasAnySafety = SAFETY_TYPES.some(t => reportWarnings.find(w => w.type === t));
  const isRouteSafe = reportWarnings.length === 0 && newsWarnings.length === 0;
  const dangerLevel = newsWarnings.length > 0 || hasAnySafety ? "high" : reportWarnings.length > 0 ? "medium" : "safe";

  return (
    <div className="glass rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-blue-200" />
            <div className="w-0.5 h-5 bg-gray-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-red-200" />
          </div>
          <div className="flex-1 space-y-1.5">
            {editOrigin ? (
              <input
                ref={originInputRef}
                type="text"
                placeholder="Da dove parti?"
                autoFocus
                className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div
                className="w-full px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700 font-medium flex items-center justify-between cursor-pointer"
                onClick={() => setEditOrigin(true)}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  {originText || "La mia posizione"}
                </span>
                <span
                  className="material-symbols-outlined text-[14px] text-blue-400 hover:text-blue-600 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onUseMyLocation(); setEditOrigin(false); }}
                >
                  gps_fixed
                </span>
              </div>
            )}
            <input
              ref={destRef}
              type="text"
              placeholder="Dove vai?"
              defaultValue={destinationText}
              onChange={(e) => { if (!e.target.value) destPosRef.current = null; }}
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onModeChange("WALKING")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${mode === "WALKING" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            <span className="material-symbols-outlined text-[16px]">directions_walk</span>
            A piedi
          </button>
          <button
            onClick={() => onModeChange("TRANSIT")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${mode === "TRANSIT" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            <span className="material-symbols-outlined text-[16px]">directions_bus</span>
            Mezzi
          </button>
        </div>
      </div>

      {routeInfo && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-blue-600 text-[16px]">schedule</span>
                {routeInfo.duration}
              </span>
              <span className="text-xs text-gray-400">{routeInfo.distance}</span>
            </div>
            <button onClick={onClear} className="text-[11px] text-red-500 font-medium flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">close</span>
              Annulla
            </button>
          </div>

          {/* Safety summary */}
          {isRouteSafe ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl border border-green-100">
              <span className="material-symbols-outlined text-green-500 text-[18px]">verified_user</span>
              <span className="text-[11px] text-green-700 font-semibold">Nessuna segnalazione lungo il percorso</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Danger level header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                dangerLevel === "high"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-100"
              }`}>
                <span className={`material-symbols-outlined text-[16px] ${dangerLevel === "high" ? "text-red-500" : "text-amber-500"}`}>
                  {dangerLevel === "high" ? "dangerous" : "warning"}
                </span>
                <span className={`text-[11px] font-bold ${dangerLevel === "high" ? "text-red-700" : "text-amber-700"}`}>
                  {dangerLevel === "high"
                    ? "Zona a rischio — valuta percorso alternativo"
                    : `${reportWarnings.reduce((s, w) => s + w.count, 0)} segnalazioni lungo il percorso`}
                </span>
              </div>

              {/* News-based dangers */}
              {newsWarnings.map((nw, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                  <span className="material-symbols-outlined text-red-500 text-[14px] mt-0.5 shrink-0">newspaper</span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-red-400 uppercase tracking-wide mb-0.5">
                      {nw.source} — notizia recente
                    </div>
                    <div className="text-[10px] text-red-800 font-medium leading-snug">{nw.title}</div>
                  </div>
                </div>
              ))}

              {/* User report warnings */}
              {reportWarnings.slice(0, 3).map((w) => (
                <div key={w.type} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: w.color + "12" }}>
                  <span className="material-symbols-outlined text-[13px]" style={{ color: w.color }}>
                    {REPORT_CONFIG[w.type as keyof typeof REPORT_CONFIG]?.icon || "info"}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: w.color }}>
                    {w.count}× {w.label} — segnalazione utenti
                    {SAFETY_TYPES.includes(w.type as never) ? " ⚠️" : ""}
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
