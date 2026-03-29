"use client";

import { useRef, useEffect, useState } from "react";
import { LatLng } from "@/lib/types";

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
}: RoutePanelProps) {
  const destRef = useRef<HTMLInputElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const [editOrigin, setEditOrigin] = useState(false);

  useEffect(() => {
    if (!apiLoaded || !window.google?.maps?.places) return;
    const bounds = new google.maps.LatLngBounds({ lat: 41.79, lng: 12.35 }, { lat: 41.99, lng: 12.65 });

    if (destRef.current) {
      const ac = new google.maps.places.Autocomplete(destRef.current, { bounds, fields: ["geometry", "name", "formatted_address"] });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          onDestinationSelect(
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            place.name || place.formatted_address || ""
          );
        }
      });
    }

    if (originInputRef.current) {
      const ac = new google.maps.places.Autocomplete(originInputRef.current, { bounds, fields: ["geometry", "name", "formatted_address"] });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          onOriginSelect(
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            place.name || place.formatted_address || ""
          );
          setEditOrigin(false);
        }
      });
    }
  }, [apiLoaded, editOrigin, onOriginSelect, onDestinationSelect]);

  return (
    <div className="glass rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Origin / Destination */}
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
              </div>
            )}
            <input
              ref={destRef}
              type="text"
              placeholder="Dove vai?"
              defaultValue={destinationText}
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange("WALKING")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              mode === "WALKING" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">directions_walk</span>
            A piedi
          </button>
          <button
            onClick={() => onModeChange("TRANSIT")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              mode === "TRANSIT" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">directions_bus</span>
            Mezzi
          </button>
        </div>
      </div>

      {/* Route result */}
      {routeInfo && (
        <div className="px-3 pb-3 flex items-center justify-between border-t border-gray-100 pt-2">
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
      )}
    </div>
  );
}
