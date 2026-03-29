"use client";

import { useRef, useEffect, useState } from "react";
import { LatLng, RouteState } from "@/lib/types";

interface RoutePanelProps {
  route: RouteState;
  onRouteChange: (route: Partial<RouteState>) => void;
  userPosition: LatLng;
  routeInfo: { distance: string; duration: string } | null;
  onClear: () => void;
  apiLoaded: boolean;
}

export default function RoutePanel({
  route,
  onRouteChange,
  userPosition,
  routeInfo,
  onClear,
  apiLoaded,
}: RoutePanelProps) {
  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);
  const [useMyLocation, setUseMyLocation] = useState(true);

  // Setup autocomplete
  useEffect(() => {
    if (!apiLoaded || !window.google?.maps?.places) return;

    const romeBounds = new google.maps.LatLngBounds(
      { lat: 41.79, lng: 12.35 },
      { lat: 41.99, lng: 12.65 }
    );

    if (destRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(destRef.current, {
        bounds: romeBounds,
        fields: ["geometry", "name", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          onRouteChange({
            destination: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            destinationText: place.name || place.formatted_address || "",
            active: true,
            origin: useMyLocation ? userPosition : route.origin,
            originText: useMyLocation ? "La mia posizione" : route.originText,
          });
        }
      });
    }

    if (originRef.current && !useMyLocation) {
      const autocomplete = new google.maps.places.Autocomplete(originRef.current, {
        bounds: romeBounds,
        fields: ["geometry", "name", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          onRouteChange({
            origin: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            originText: place.name || place.formatted_address || "",
          });
        }
      });
    }
  }, [apiLoaded, useMyLocation]);

  const travelModes = [
    { mode: "WALKING" as const, icon: "directions_walk", label: "A piedi" },
    { mode: "TRANSIT" as const, icon: "directions_bus", label: "Mezzi" },
    { mode: "DRIVING" as const, icon: "directions_car", label: "Auto" },
    { mode: "SAFE_WALK" as const, icon: "shield", label: "Sicuro" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Route inputs */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-blue-200" />
            <div className="w-0.5 h-6 bg-gray-200" />
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-200" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="relative">
              {useMyLocation ? (
                <div
                  className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-sm text-blue-700 font-medium flex items-center justify-between cursor-pointer"
                  onClick={() => setUseMyLocation(false)}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">my_location</span>
                    La mia posizione
                  </span>
                  <span className="text-[10px] text-blue-400">cambia</span>
                </div>
              ) : (
                <input
                  ref={originRef}
                  type="text"
                  placeholder="Partenza..."
                  defaultValue={route.originText}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              )}
            </div>
            <input
              ref={destRef}
              type="text"
              placeholder="Dove vuoi andare?"
              defaultValue={route.destinationText}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Travel mode */}
        <div className="flex gap-2">
          {travelModes.map((tm) => (
            <button
              key={tm.mode}
              onClick={() => onRouteChange({ mode: tm.mode as RouteState["mode"] })}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-medium transition ${
                route.mode === tm.mode
                  ? tm.mode === "SAFE_WALK"
                    ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                    : "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tm.icon}</span>
              {tm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Route info */}
      {routeInfo && (
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <span className="material-symbols-outlined text-[18px] text-blue-600">schedule</span>
              {routeInfo.duration}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="material-symbols-outlined text-[18px]">straighten</span>
              {routeInfo.distance}
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Annulla
          </button>
        </div>
      )}

      {/* Safe walk banner */}
      {route.mode === "SAFE_WALK" && (
        <div className="mx-4 mb-3 bg-green-50 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2 text-green-700">
            <span className="material-symbols-outlined text-[18px]">shield</span>
            <div>
              <p className="text-xs font-semibold">Percorso Sicuro</p>
              <p className="text-[10px] text-green-600">
                Privilegia strade principali, illuminate e con attivita commerciali.
                Basato sulle segnalazioni della community.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
