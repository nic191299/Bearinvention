"use client";

import { useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Circle,
  InfoWindow,
} from "@react-google-maps/api";
import { LatLng, SafetyReport, SAFETY_TYPES } from "@/lib/types";
import { useState } from "react";

const libraries: ("places")[] = ["places"];

interface SafetyMapProps {
  apiKey: string;
  userPosition: LatLng;
  reports: SafetyReport[];
}

export default function SafetyMap({ apiKey, userPosition, reports }: SafetyMapProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<SafetyReport | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={userPosition}
      zoom={14}
      onLoad={onLoad}
      onClick={() => setSelected(null)}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "all", elementType: "geometry", stylers: [{ saturation: -20 }] },
        ],
      }}
    >
      {/* User */}
      <Marker
        position={userPosition}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        }}
        zIndex={100}
      />

      {/* Safety report markers + danger zones */}
      {reports.map((report) => {
        const config = SAFETY_TYPES[report.type];
        const severity = Math.min(report.upvotes / 30, 1);
        const radius = 80 + severity * 120;

        return (
          <div key={report.id}>
            {/* Danger zone circle */}
            <Circle
              center={report.position}
              radius={radius}
              options={{
                fillColor: config.color,
                fillOpacity: 0.12 + severity * 0.1,
                strokeColor: config.color,
                strokeOpacity: 0.3,
                strokeWeight: 1,
              }}
            />
            {/* Marker */}
            <Marker
              position={report.position}
              onClick={() => setSelected(report)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: config.color,
                fillOpacity: 0.9,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
              zIndex={50}
            />
          </div>
        );
      })}

      {/* Info window */}
      {selected && (
        <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
          <div className="p-2 max-w-[250px]">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: SAFETY_TYPES[selected.type].color }}
              >
                {SAFETY_TYPES[selected.type].label}
              </span>
              <span className="text-[10px] text-gray-400">
                {selected.timeOfDay === "night" ? "Di notte" : selected.timeOfDay === "day" ? "Di giorno" : "Sempre"}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-snug">{selected.message}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px]">
              <span className="text-gray-400">{selected.author}</span>
              <span className="text-red-500">Confermato {selected.upvotes}x</span>
              {selected.confirmedSafe > 0 && (
                <span className="text-green-600">Sicuro ora: {selected.confirmedSafe}x</span>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
