"use client";

import { useRef, useEffect, useState } from "react";
import { LatLng, Report, REPORT_CONFIG, SAFETY_TYPES } from "@/lib/types";
import { haversine } from "@/lib/geo";
import { getCityBounds } from "@/lib/cityData";
import type { CityInfo } from "@/lib/cityData";

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
}: RoutePanelProps) {
  const destRef = useRef<HTMLInputElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const [editOrigin, setEditOrigin] = useState(false);
  const [safetyWarnings, setSafetyWarnings] = useState<{ type: string; label: string; color: string; count: number }[]>([]);

  // Set up autocomplete (re-runs when city changes to update bounds)
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
          onDestinationSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }, place.name || place.formatted_address || "");
      });
    }
    if (originInputRef.current) {
      const ac = new google.maps.places.Autocomplete(originInputRef.current, opts);
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          onOriginSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }, place.name || place.formatted_address || "");
          setEditOrigin(false);
        }
      });
    }
  }, [apiLoaded, editOrigin, city, onOriginSelect, onDestinationSelect]);

  // Compute safety warnings along route (simple bounding box)
  useEffect(() => {
    if (!routeInfo || reports.length === 0) { setSafetyWarnings([]); return; }
    const [originPos, destPos] = [originRef.current, destPosRef.current];
    if (!originPos || !destPos) { setSafetyWarnings([]); return; }

    const minLat = Math.min(originPos.lat, destPos.lat) - 0.008;
    const maxLat = Math.max(originPos.lat, destPos.lat) + 0.008;
    const minLng = Math.min(originPos.lng, destPos.lng) - 0.008;
    const maxLng = Math.max(originPos.lng, destPos.lng) + 0.008;

    const near = reports.filter(r =>
      r.position.lat >= minLat && r.position.lat <= maxLat &&
      r.position.lng >= minLng && r.position.lng <= maxLng
    );

    const counts: Record<string, number> = {};
    for (const r of near) counts[r.type] = (counts[r.type] || 0) + 1;

    const warnings = Object.entries(counts).map(([type, count]) => ({
      type,
      label: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.label || type,
      color: REPORT_CONFIG[type as keyof typeof REPORT_CONFIG]?.color || "#6b7280",
      count,
    }));
    warnings.sort((a, b) => (SAFETY_TYPES.includes(a.type as never) ? -1 : 1) - (SAFETY_TYPES.includes(b.type as never) ? -1 : 1));
    setSafetyWarnings(warnings);
  }, [routeInfo, reports]);

  // Refs to track current positions for the warning calculation
  const originRef = useRef<LatLng | null>(null);
  const destPosRef = useRef<LatLng | null>(null);

  const handleOriginSelect = (pos: LatLng, text: string) => {
    originRef.current = pos;
    onOriginSelect(pos, text);
  };
  const handleDestSelect = (pos: LatLng, text: string) => {
    destPosRef.current = pos;
    onDestinationSelect(pos, text);
  };
  const handleMyLocation = () => {
    onUseMyLocation();
  };

  const safetyCount = safetyWarnings.filter(w => SAFETY_TYPES.includes(w.type as never)).length;
  const isRouteSafe = safetyCount === 0 && safetyWarnings.length === 0;

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
                  onClick={(e) => { e.stopPropagation(); handleMyLocation(); setEditOrigin(false); }}
                  title="Usa posizione attuale"
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
              onChange={(e) => { if (!e.target.value) { destPosRef.current = null; } }}
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
            <div className="flex items-center gap-2 px-2.5 py-2 bg-green-50 rounded-xl border border-green-100">
              <span className="material-symbols-outlined text-green-500 text-[16px]">verified_user</span>
              <span className="text-[11px] text-green-700 font-medium">Percorso senza segnalazioni attive</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-xl border border-amber-100">
                <span className="material-symbols-outlined text-amber-500 text-[14px]">warning</span>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {safetyWarnings.reduce((s, w) => s + w.count, 0)} segnalazioni lungo il percorso
                </span>
              </div>
              {safetyWarnings.slice(0, 3).map((w) => (
                <div key={w.type} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: w.color + "12" }}>
                  <span className="material-symbols-outlined text-[13px]" style={{ color: w.color }}>
                    {REPORT_CONFIG[w.type as keyof typeof REPORT_CONFIG]?.icon || "info"}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: w.color }}>
                    {w.count}× {w.label}
                    {SAFETY_TYPES.includes(w.type as never) ? " — valuta percorso alternativo" : ""}
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
