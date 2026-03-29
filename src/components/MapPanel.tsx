"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  TrafficLayer,
  InfoWindow,
} from "@react-google-maps/api";
import { LatLng, TransportReport, SafetyReport, TRANSPORT_TYPES, SAFETY_TYPES, RouteState } from "@/lib/types";

const libraries: ("places")[] = ["places"];

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station.bus", elementType: "labels", stylers: [{ visibility: "on" }] },
];

const DARK_MAP_ID = undefined; // Use default styling

interface MapPanelProps {
  apiKey: string;
  userPosition: LatLng;
  transportReports: TransportReport[];
  safetyReports: SafetyReport[];
  route: RouteState;
  onMapClick: (pos: LatLng) => void;
  onDirectionsResult: (result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => void;
  showTraffic: boolean;
  showSafetyLayer: boolean;
  selectedReport: TransportReport | SafetyReport | null;
  onSelectReport: (r: TransportReport | SafetyReport | null) => void;
}

export default function MapPanel({
  apiKey,
  userPosition,
  transportReports,
  safetyReports,
  route,
  onMapClick,
  onDirectionsResult,
  showTraffic,
  showSafetyLayer,
  selectedReport,
  onSelectReport,
}: MapPanelProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Calculate route when origin/destination change
  useEffect(() => {
    if (!isLoaded || !route.origin || !route.destination || !route.active) {
      setDirections(null);
      onDirectionsResult(null, null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    const travelMode = route.mode === "SAFE_WALK" ? google.maps.TravelMode.WALKING : route.mode;

    directionsService.route(
      {
        origin: route.origin,
        destination: route.destination,
        travelMode,
        provideRouteAlternatives: true,
        transitOptions: travelMode === google.maps.TravelMode.TRANSIT ? { modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAM] } : undefined,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          onDirectionsResult(result, leg ? {
            distance: leg.distance?.text || "",
            duration: leg.duration?.text || "",
          } : null);
        } else {
          setDirections(null);
          onDirectionsResult(null, null);
        }
      }
    );
  }, [isLoaded, route.origin, route.destination, route.mode, route.active, onDirectionsResult]);

  // Pan to user position
  useEffect(() => {
    if (mapRef.current && userPosition) {
      mapRef.current.panTo(userPosition);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Caricamento mappa...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={userPosition}
      zoom={14}
      onLoad={onLoad}
      onClick={(e) => {
        if (e.latLng) onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        onSelectReport(null);
      }}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: "greedy",
        clickableIcons: false,
      }}
    >
      {/* Traffic */}
      {showTraffic && <TrafficLayer />}

      {/* User position */}
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
      {/* User pulse ring */}
      <Marker
        position={userPosition}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 25,
          fillColor: "#2563eb",
          fillOpacity: 0.15,
          strokeColor: "#2563eb",
          strokeWeight: 1,
          strokeOpacity: 0.3,
        }}
        zIndex={99}
        clickable={false}
      />

      {/* Transport report markers */}
      {transportReports.map((report) => {
        const config = TRANSPORT_TYPES[report.type];
        return (
          <Marker
            key={report.id}
            position={report.position}
            onClick={() => onSelectReport(report)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: config.color,
              fillOpacity: 0.9,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            label={{
              text: report.type === "delay" ? "⏱" : report.type === "cancelled" ? "✕" : report.type === "crowded" ? "👥" : report.type === "strike" ? "✋" : report.type === "broken" ? "⚙" : "↗",
              fontSize: "11px",
            }}
            zIndex={50}
          />
        );
      })}

      {/* Safety report markers */}
      {showSafetyLayer && safetyReports.map((report) => {
        const config = SAFETY_TYPES[report.type];
        return (
          <Marker
            key={report.id}
            position={report.position}
            onClick={() => onSelectReport(report)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: config.color,
              fillOpacity: 0.8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            zIndex={40}
          />
        );
      })}

      {/* Info window */}
      {selectedReport && (
        <InfoWindow
          position={selectedReport.position}
          onCloseClick={() => onSelectReport(null)}
        >
          <div className="p-2 max-w-[250px]">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: "type" in selectedReport && selectedReport.type in TRANSPORT_TYPES
                  ? TRANSPORT_TYPES[selectedReport.type as keyof typeof TRANSPORT_TYPES].color
                  : SAFETY_TYPES[(selectedReport as SafetyReport).type].color
                }}
              >
                {"type" in selectedReport && selectedReport.type in TRANSPORT_TYPES
                  ? TRANSPORT_TYPES[selectedReport.type as keyof typeof TRANSPORT_TYPES].label
                  : SAFETY_TYPES[(selectedReport as SafetyReport).type].label}
              </span>
              <span className="text-[11px] text-gray-400">
                {Math.round((Date.now() - selectedReport.timestamp.getTime()) / 60000)} min fa
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-snug">{selectedReport.message}</p>
            <p className="text-[11px] text-gray-400 mt-1">{selectedReport.author} · 👍 {selectedReport.upvotes}</p>
          </div>
        </InfoWindow>
      )}

      {/* Directions */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: route.mode === "SAFE_WALK" ? "#10b981" : "#2563eb",
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}
