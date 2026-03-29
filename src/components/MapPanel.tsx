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
import { LatLng, Report, NewsAlert, REPORT_CONFIG } from "@/lib/types";
import { fetchRadarFrames, getRadarTileUrl } from "@/lib/weather";
import { WeatherZonePoint, fetchWeatherZones } from "@/lib/weatherZones";

const libraries: ("places")[] = ["places"];

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels", stylers: [{ visibility: "on" }] },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isNearRoute(point: LatLng, result: google.maps.DirectionsResult | null, threshold = 200): boolean {
  if (!result?.routes[0]) return false;
  for (const leg of result.routes[0].legs) {
    for (const step of leg.steps) {
      if (step.path) {
        for (const p of step.path) {
          if (haversine(point.lat, point.lng, p.lat(), p.lng()) < threshold) return true;
        }
      }
    }
  }
  return false;
}

// Posizioni note di Roma per piazzare i marker delle news
const ROME_POSITIONS: LatLng[] = [
  { lat: 41.8986, lng: 12.4769 },  // Largo Argentina
  { lat: 41.9028, lng: 12.4964 },  // Piazza Venezia
  { lat: 41.8902, lng: 12.4922 },  // Colosseo
  { lat: 41.9009, lng: 12.4833 },  // Trastevere
  { lat: 41.9106, lng: 12.5017 },  // Termini
  { lat: 41.9100, lng: 12.4768 },  // Piazza del Popolo
  { lat: 41.9022, lng: 12.4539 },  // Stazione Trastevere
  { lat: 41.9010, lng: 12.5024 },  // San Giovanni
  { lat: 41.9073, lng: 12.5175 },  // Tiburtina
  { lat: 41.8578, lng: 12.5194 },  // EUR
  { lat: 41.8827, lng: 12.4707 },  // Ostiense
  { lat: 41.9186, lng: 12.4614 },  // Prati / Vaticano
  { lat: 41.8674, lng: 12.4711 },  // Garbatella
  { lat: 41.9242, lng: 12.4952 },  // Parioli
  { lat: 41.8719, lng: 12.5674 },  // Cinecittà
];

const NEWS_MARKER_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  road_closure: { icon: "block", color: "#f97316", label: "Chiusura strada" },
  strike: { icon: "front_hand", color: "#ef4444", label: "Sciopero" },
  event: { icon: "event", color: "#eab308", label: "Evento" },
  transport: { icon: "directions_bus", color: "#ef4444", label: "Problema trasporti" },
  crime: { icon: "local_police", color: "#dc2626", label: "Sicurezza" },
};

interface MapPanelProps {
  apiKey: string;
  userPosition: LatLng;
  reports: Report[];
  newsAlerts: NewsAlert[];
  showRadar: boolean;
  showTraffic: boolean;
  directions: google.maps.DirectionsResult | null;
  onDirectionsChange: (result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => void;
  routeOrigin: LatLng | null;
  routeDestination: LatLng | null;
  routeMode: string;
  routeActive: boolean;
}

export default function MapPanel({
  apiKey,
  userPosition,
  reports,
  newsAlerts,
  showRadar,
  showTraffic,
  directions,
  onDirectionsChange,
  routeOrigin,
  routeDestination,
  routeMode,
  routeActive,
}: MapPanelProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const radarRef = useRef<google.maps.ImageMapType | null>(null);
  const [localDirections, setLocalDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [weatherZones, setWeatherZones] = useState<WeatherZonePoint[]>([]);
  const [selectedWz, setSelectedWz] = useState<WeatherZonePoint | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedNews, setSelectedNews] = useState<(NewsAlert & { position: LatLng }) | null>(null);
  const [zoom, setZoom] = useState(14);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("zoom_changed", () => setZoom(map.getZoom() || 14));
  }, []);

  // Weather zones
  useEffect(() => {
    if (!showRadar) { setWeatherZones([]); return; }
    fetchWeatherZones().then(setWeatherZones);
    const i = setInterval(() => fetchWeatherZones().then(setWeatherZones), 10 * 60 * 1000);
    return () => clearInterval(i);
  }, [showRadar]);

  // Directions
  useEffect(() => {
    if (!isLoaded || !routeOrigin || !routeDestination || !routeActive) {
      setLocalDirections(null);
      onDirectionsChange(null, null);
      return;
    }
    const svc = new google.maps.DirectionsService();
    const travelMode = routeMode === "WALKING" ? google.maps.TravelMode.WALKING : google.maps.TravelMode.TRANSIT;
    svc.route(
      {
        origin: routeOrigin,
        destination: routeDestination,
        travelMode,
        provideRouteAlternatives: true,
        ...(travelMode === google.maps.TravelMode.TRANSIT
          ? { transitOptions: { modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAM] } }
          : {}),
      },
      (result, status) => {
        if (status === "OK" && result) {
          setLocalDirections(result);
          const leg = result.routes[0]?.legs[0];
          onDirectionsChange(result, leg ? { distance: leg.distance?.text || "", duration: leg.duration?.text || "" } : null);
        } else {
          setLocalDirections(null);
          onDirectionsChange(null, null);
        }
      }
    );
  }, [isLoaded, routeOrigin, routeDestination, routeMode, routeActive, onDirectionsChange]);

  // Pan once
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(userPosition);
  }, []);

  // Radar overlay
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;
    if (radarRef.current) { map.overlayMapTypes.clear(); radarRef.current = null; }
    if (!showRadar) return;

    fetchRadarFrames().then((frames) => {
      if (!frames || !mapRef.current) return;
      const all = [...frames.past, ...frames.nowcast];
      const latest = all[all.length - 1];
      if (!latest) return;
      const url = getRadarTileUrl(latest, 256);
      const layer = new google.maps.ImageMapType({
        getTileUrl: (coord, z) => {
          const cz = Math.min(z, 12);
          const scale = Math.pow(2, z - cz);
          return url.replace("{z}", String(cz)).replace("{x}", String(Math.floor(coord.x / scale))).replace("{y}", String(Math.floor(coord.y / scale)));
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: 0.5,
        name: "Radar",
      });
      mapRef.current.overlayMapTypes.push(layer);
      radarRef.current = layer;
    });
  }, [isLoaded, showRadar]);

  const showReports = zoom >= 15;
  const visibleReports = reports.filter((r) => showReports || isNearRoute(r.position, localDirections));

  // News markers: only road_closure, strike, event, transport
  const newsMarkers = newsAlerts
    .filter((a) => a.category !== "general")
    .map((a, i) => ({
      ...a,
      position: ROME_POSITIONS[i % ROME_POSITIONS.length],
    }))
    .filter((a) => showReports || isNearRoute(a.position, localDirections));

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={userPosition}
      zoom={14}
      onLoad={onLoad}
      onClick={() => { setSelectedReport(null); setSelectedWz(null); setSelectedNews(null); }}
      options={{
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        gestureHandling: "greedy",
        clickableIcons: false,
      }}
    >
      {showTraffic && <TrafficLayer />}

      {/* Weather zones */}
      {showRadar && weatherZones.map((wz, i) => (
        <Circle
          key={`wz${i}`}
          center={wz.position}
          radius={700}
          options={{ fillColor: wz.color, fillOpacity: 0.25, strokeColor: wz.color, strokeOpacity: 0.6, strokeWeight: 2, clickable: true }}
          onClick={() => { setSelectedWz(wz); setSelectedReport(null); }}
        />
      ))}
      {showRadar && weatherZones.map((wz, i) => (
        <Marker
          key={`wzl${i}`}
          position={wz.position}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
          label={{ text: `${Math.round(wz.temperature)}°`, color: wz.precipitation > 0 ? "#2563eb" : "#374151", fontSize: "11px", fontWeight: "bold" }}
          clickable={false}
        />
      ))}
      {selectedWz && (
        <InfoWindow position={selectedWz.position} onCloseClick={() => setSelectedWz(null)}>
          <div style={{ padding: 6, maxWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedWz.name}</div>
            <div style={{ fontSize: 20, fontWeight: 700, margin: "4px 0" }}>{Math.round(selectedWz.temperature)}°C <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>{selectedWz.label}</span></div>
            {selectedWz.precipitation > 0 && <div style={{ fontSize: 11, color: "#2563eb" }}>Precipitazioni: {selectedWz.precipitation}mm</div>}
            <div style={{ fontSize: 11, color: "#64748b" }}>Vento: {Math.round(selectedWz.windSpeed)} km/h</div>
            {selectedWz.precipitation > 0.5 && <div style={{ marginTop: 4, padding: "3px 8px", background: "#eff6ff", borderRadius: 6, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>Piove qui! Prendi la metro</div>}
          </div>
        </InfoWindow>
      )}

      {/* User */}
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }} zIndex={100} />
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 25, fillColor: "#2563eb", fillOpacity: 0.15, strokeColor: "#2563eb", strokeWeight: 1, strokeOpacity: 0.3 }} zIndex={99} clickable={false} />

      {/* Reports */}
      {visibleReports.map((r) => {
        const cfg = REPORT_CONFIG[r.type];
        return (
          <Marker
            key={r.id}
            position={r.position}
            onClick={() => { setSelectedReport(r); setSelectedWz(null); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: cfg.color, fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 2 }}
            zIndex={50}
          />
        );
      })}
      {selectedReport && (
        <InfoWindow position={selectedReport.position} onCloseClick={() => setSelectedReport(null)}>
          <div style={{ padding: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: "#fff", backgroundColor: REPORT_CONFIG[selectedReport.type].color }}>
                {REPORT_CONFIG[selectedReport.type].label}
              </span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{Math.round((Date.now() - selectedReport.timestamp.getTime()) / 60000)} min fa</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Confermato da {selectedReport.upvotes} utenti</div>
          </div>
        </InfoWindow>
      )}

      {/* News markers */}
      {newsMarkers.map((n) => {
        const cfg = NEWS_MARKER_CONFIG[n.category];
        if (!cfg) return null;
        return (
          <Marker
            key={`news-${n.id}`}
            position={n.position}
            onClick={() => { setSelectedNews(n); setSelectedReport(null); setSelectedWz(null); }}
            icon={{
              path: "M-12,-12 L12,-12 L12,12 L-12,12 Z",
              scale: 1,
              fillColor: cfg.color,
              fillOpacity: 0.9,
              strokeColor: "#fff",
              strokeWeight: 2,
              anchor: new google.maps.Point(0, 0),
            }}
            zIndex={45}
          />
        );
      })}
      {selectedNews && NEWS_MARKER_CONFIG[selectedNews.category] && (
        <InfoWindow position={selectedNews.position} onCloseClick={() => setSelectedNews(null)}>
          <div style={{ padding: 6, maxWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: "#fff", backgroundColor: NEWS_MARKER_CONFIG[selectedNews.category].color }}>
                {NEWS_MARKER_CONFIG[selectedNews.category].label}
              </span>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, margin: "4px 0", lineHeight: 1.4 }}>{selectedNews.title}</p>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{selectedNews.source} &middot; {selectedNews.date}</div>
            {selectedNews.url && (
              <a href={selectedNews.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#2563eb", fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                Leggi notizia &rarr;
              </a>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Directions */}
      {localDirections && (
        <DirectionsRenderer
          directions={localDirections}
          options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.8 } }}
        />
      )}
    </GoogleMap>
  );
}
