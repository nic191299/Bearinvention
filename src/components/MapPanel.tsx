"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  TrafficLayer,
  InfoWindow,
  Circle,
} from "@react-google-maps/api";
import { LatLng, TransportReport, SafetyReport, TRANSPORT_TYPES, SAFETY_TYPES, RouteState } from "@/lib/types";
import { fetchRadarFrames, getRadarTileUrl } from "@/lib/weather";
import { WeatherZonePoint, fetchWeatherZones } from "@/lib/weatherZones";
import { crimeZones, RISK_COLORS, CrimeZone } from "@/lib/crimeData";

const libraries: ("places")[] = ["places"];

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station.bus", elementType: "labels", stylers: [{ visibility: "on" }] },
];

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
  showRadar: boolean;
  selectedReport: TransportReport | SafetyReport | null;
  onSelectReport: (r: TransportReport | SafetyReport | null) => void;
}

// Check if a point is near a route polyline
function isNearRoute(point: LatLng, routeResult: google.maps.DirectionsResult | null, thresholdMeters: number = 200): boolean {
  if (!routeResult) return false;
  const route = routeResult.routes[0];
  if (!route) return false;

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      if (step.path) {
        for (const pathPoint of step.path) {
          const dist = haversine(point.lat, point.lng, pathPoint.lat(), pathPoint.lng());
          if (dist < thresholdMeters) return true;
        }
      }
    }
  }
  return false;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  showRadar,
  selectedReport,
  onSelectReport,
}: MapPanelProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const radarOverlayRef = useRef<google.maps.ImageMapType | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [weatherZones, setWeatherZones] = useState<WeatherZonePoint[]>([]);
  const [selectedCrimeZone, setSelectedCrimeZone] = useState<CrimeZone | null>(null);
  const [selectedWeatherZone, setSelectedWeatherZone] = useState<WeatherZonePoint | null>(null);
  const [zoom, setZoom] = useState(14);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("zoom_changed", () => {
      setZoom(map.getZoom() || 14);
    });
  }, []);

  // Fetch weather zones
  useEffect(() => {
    if (!showRadar) { setWeatherZones([]); return; }
    fetchWeatherZones().then(setWeatherZones);
    const interval = setInterval(() => fetchWeatherZones().then(setWeatherZones), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showRadar]);

  // Calculate route
  useEffect(() => {
    if (!isLoaded || !route.origin || !route.destination || !route.active) {
      setDirections(null);
      onDirectionsResult(null, null);
      return;
    }
    const svc = new google.maps.DirectionsService();
    const travelMode = route.mode === "SAFE_WALK" ? google.maps.TravelMode.WALKING : route.mode;
    svc.route(
      {
        origin: route.origin,
        destination: route.destination,
        travelMode,
        provideRouteAlternatives: true,
        transitOptions: travelMode === google.maps.TravelMode.TRANSIT
          ? { modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAM] }
          : undefined,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          onDirectionsResult(result, leg ? { distance: leg.distance?.text || "", duration: leg.duration?.text || "" } : null);
        } else {
          setDirections(null);
          onDirectionsResult(null, null);
        }
      }
    );
  }, [isLoaded, route.origin, route.destination, route.mode, route.active, onDirectionsResult]);

  // Pan on first load
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(userPosition);
  }, []);

  // Radar overlay - with zoom level clamping
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;

    if (radarOverlayRef.current) {
      map.overlayMapTypes.clear();
      radarOverlayRef.current = null;
    }
    if (!showRadar) return;

    fetchRadarFrames().then((frames) => {
      if (!frames || !mapRef.current) return;
      const allFrames = [...frames.past, ...frames.nowcast];
      const latestFrame = allFrames[allFrames.length - 1];
      if (!latestFrame) return;

      const tileUrl = getRadarTileUrl(latestFrame, 256);
      const radarLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, z) => {
          // RainViewer supports zoom 1-12. For higher zoom, use z=12 tiles
          const clampedZoom = Math.min(z, 12);
          if (clampedZoom !== z) {
            // Scale tile coordinates for higher zoom levels
            const scale = Math.pow(2, z - clampedZoom);
            const scaledX = Math.floor(coord.x / scale);
            const scaledY = Math.floor(coord.y / scale);
            return tileUrl
              .replace("{z}", String(clampedZoom))
              .replace("{x}", String(scaledX))
              .replace("{y}", String(scaledY));
          }
          return tileUrl
            .replace("{z}", String(z))
            .replace("{x}", String(coord.x))
            .replace("{y}", String(coord.y));
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.5,
        name: "RainViewer",
      });

      mapRef.current.overlayMapTypes.push(radarLayer);
      radarOverlayRef.current = radarLayer;
    });
  }, [isLoaded, showRadar]);

  const isNight = new Date().getHours() >= 21 || new Date().getHours() < 6;

  // Determine which reports to show:
  // - Always show if zoomed in (>= 15)
  // - Always show if on active route
  // - Otherwise hide individual reports (zones still visible)
  const shouldShowReports = zoom >= 15;
  const hasActiveRoute = !!directions;

  const visibleTransportReports = transportReports.filter((r) =>
    shouldShowReports || (hasActiveRoute && isNearRoute(r.position, directions))
  );
  const visibleSafetyReports = safetyReports.filter((r) =>
    shouldShowReports || (hasActiveRoute && isNearRoute(r.position, directions))
  );

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
        setSelectedCrimeZone(null);
        setSelectedWeatherZone(null);
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
      {showTraffic && <TrafficLayer />}

      {/* ===== CRIME ZONES (always visible when layer on) ===== */}
      {showSafetyLayer && crimeZones.map((zone) => {
        const effectiveRisk = isNight ? Math.min(5, Math.round(zone.riskLevel * zone.nightRiskMultiplier)) : zone.riskLevel;
        const color = RISK_COLORS[effectiveRisk] || RISK_COLORS[zone.riskLevel];
        return (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            options={{
              fillColor: color,
              fillOpacity: 0.18 + effectiveRisk * 0.04,
              strokeColor: color,
              strokeOpacity: 0.5,
              strokeWeight: 2,
              clickable: true,
            }}
            onClick={() => { setSelectedCrimeZone(zone); setSelectedWeatherZone(null); onSelectReport(null); }}
          />
        );
      })}

      {showSafetyLayer && crimeZones.map((zone) => {
        const effectiveRisk = isNight ? Math.min(5, Math.round(zone.riskLevel * zone.nightRiskMultiplier)) : zone.riskLevel;
        return (
          <Marker
            key={`czl-${zone.id}`}
            position={zone.center}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
            label={{ text: `${zone.name} ★${effectiveRisk}`, color: RISK_COLORS[effectiveRisk], fontSize: "10px", fontWeight: "bold" }}
            clickable={false}
            zIndex={30}
          />
        );
      })}

      {selectedCrimeZone && (
        <InfoWindow position={selectedCrimeZone.center} onCloseClick={() => setSelectedCrimeZone(null)}>
          <div className="p-2 max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: RISK_COLORS[selectedCrimeZone.riskLevel] }}>
                Rischio {selectedCrimeZone.riskLabel}
              </span>
              {isNight && selectedCrimeZone.nightRiskMultiplier > 1.3 && (
                <span className="text-[10px] bg-gray-800 text-yellow-300 px-2 py-0.5 rounded font-medium">+pericoloso di notte</span>
              )}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>{selectedCrimeZone.name}</h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px", lineHeight: 1.4 }}>{selectedCrimeZone.details}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(selectedCrimeZone.stats).map(([key, val]) => (
                <div key={key} style={{ fontSize: 10, color: "#94a3b8" }}>
                  <span style={{ fontWeight: 600 }}>{key === "pickpocket" ? "Borseggi" : key === "theft" ? "Furti" : key === "robbery" ? "Rapine" : key === "assault" ? "Aggressioni" : "Vandalismo"}</span>
                  {" "}{"●".repeat(val)}{"○".repeat(5 - val)}
                </div>
              ))}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* ===== WEATHER ZONES ===== */}
      {showRadar && weatherZones.map((wz, i) => (
        <Circle
          key={`wz-${i}`}
          center={wz.position}
          radius={700}
          options={{
            fillColor: wz.color,
            fillOpacity: 0.25,
            strokeColor: wz.color,
            strokeOpacity: 0.6,
            strokeWeight: 2,
            clickable: true,
          }}
          onClick={() => { setSelectedWeatherZone(wz); setSelectedCrimeZone(null); onSelectReport(null); }}
        />
      ))}

      {showRadar && weatherZones.map((wz, i) => (
        <Marker
          key={`wzm-${i}`}
          position={wz.position}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
          label={{ text: `${Math.round(wz.temperature)}°`, color: wz.precipitation > 0 ? "#2563eb" : "#374151", fontSize: "11px", fontWeight: "bold" }}
          clickable={false}
          zIndex={35}
        />
      ))}

      {selectedWeatherZone && (
        <InfoWindow position={selectedWeatherZone.position} onCloseClick={() => setSelectedWeatherZone(null)}>
          <div className="p-2 max-w-[220px]">
            <h3 style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{selectedWeatherZone.name}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(selectedWeatherZone.temperature)}°C</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{selectedWeatherZone.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {selectedWeatherZone.precipitation > 0 && <div>Precipitazioni: {selectedWeatherZone.precipitation}mm</div>}
              <div>Vento: {Math.round(selectedWeatherZone.windSpeed)} km/h (raffiche {Math.round(selectedWeatherZone.windGusts)})</div>
            </div>
            {selectedWeatherZone.precipitation > 0.5 && (
              <div style={{ marginTop: 6, padding: "4px 8px", background: "#eff6ff", borderRadius: 8, fontSize: 11, color: "#2563eb", fontWeight: 500 }}>
                Piove qui — meglio la metro!
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* ===== USER POSITION ===== */}
      <Marker
        position={userPosition}
        icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 }}
        zIndex={100}
      />
      <Marker
        position={userPosition}
        icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 25, fillColor: "#2563eb", fillOpacity: 0.15, strokeColor: "#2563eb", strokeWeight: 1, strokeOpacity: 0.3 }}
        zIndex={99}
        clickable={false}
      />

      {/* ===== REPORTS (visible only when zoomed in or on route) ===== */}
      {visibleTransportReports.map((report) => {
        const config = TRANSPORT_TYPES[report.type];
        return (
          <Marker
            key={report.id}
            position={report.position}
            onClick={() => { onSelectReport(report); setSelectedCrimeZone(null); setSelectedWeatherZone(null); }}
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

      {showSafetyLayer && visibleSafetyReports.map((report) => {
        const config = SAFETY_TYPES[report.type];
        return (
          <Marker
            key={report.id}
            position={report.position}
            onClick={() => { onSelectReport(report); setSelectedCrimeZone(null); setSelectedWeatherZone(null); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: config.color, fillOpacity: 0.8, strokeColor: "#ffffff", strokeWeight: 2 }}
            zIndex={40}
          />
        );
      })}

      {selectedReport && (
        <InfoWindow position={selectedReport.position} onCloseClick={() => onSelectReport(null)}>
          <div className="p-2 max-w-[250px]">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{
                  backgroundColor: selectedReport.type in TRANSPORT_TYPES
                    ? TRANSPORT_TYPES[selectedReport.type as keyof typeof TRANSPORT_TYPES].color
                    : SAFETY_TYPES[(selectedReport as SafetyReport).type].color
                }}
              >
                {selectedReport.type in TRANSPORT_TYPES
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

      {/* ===== DIRECTIONS ===== */}
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
