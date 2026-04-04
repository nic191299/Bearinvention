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
import { computeConfidence } from "@/lib/geo";
import { getSessionId } from "@/lib/session";

const libraries: ("places" | "visualization")[] = ["places", "visualization"];

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

const NEWS_POSITIONS: LatLng[] = [
  { lat: 41.8986, lng: 12.4769 }, { lat: 41.9028, lng: 12.4964 }, { lat: 41.8902, lng: 12.4922 },
  { lat: 41.9009, lng: 12.4833 }, { lat: 41.9106, lng: 12.5017 }, { lat: 41.9100, lng: 12.4768 },
  { lat: 41.9022, lng: 12.4539 }, { lat: 41.9010, lng: 12.5024 }, { lat: 41.9073, lng: 12.5175 },
  { lat: 41.8578, lng: 12.5194 }, { lat: 41.8827, lng: 12.4707 }, { lat: 41.9186, lng: 12.4614 },
  { lat: 41.8674, lng: 12.4711 }, { lat: 41.9242, lng: 12.4952 }, { lat: 41.8719, lng: 12.5674 },
];

const NEWS_MARKER_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  road_closure: { icon: "block", color: "#f97316", label: "Chiusura strada" },
  strike: { icon: "front_hand", color: "#ef4444", label: "Sciopero" },
  event: { icon: "event", color: "#eab308", label: "Evento" },
  transport: { icon: "directions_bus", color: "#ef4444", label: "Problema trasporti" },
  crime: { icon: "local_police", color: "#dc2626", label: "Sicurezza" },
};

interface FamilyMember {
  userId: string;
  displayName: string;
  avatarColor: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

interface MapPanelProps {
  apiKey: string;
  userPosition: LatLng;
  userWatching?: boolean;
  cityCenter?: LatLng;
  reports: Report[];
  newsAlerts: NewsAlert[];
  showRadar: boolean;
  showTraffic: boolean;
  showHeatmap: boolean;
  directions: google.maps.DirectionsResult | null;
  onDirectionsChange: (result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => void;
  routeOrigin: LatLng | null;
  routeDestination: LatLng | null;
  routeMode: string;
  routeActive: boolean;         // also controls news markers visibility
  onVote: (reportId: string, vote: 1 | -1) => void;
  familyMembers?: FamilyMember[];
}

export default function MapPanel({
  apiKey,
  userPosition,
  userWatching = false,
  cityCenter,
  reports,
  newsAlerts,
  showRadar,
  showTraffic,
  showHeatmap,
  directions,
  onDirectionsChange,
  routeOrigin,
  routeDestination,
  routeMode,
  routeActive,
  onVote,
  familyMembers = [],
}: MapPanelProps) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const radarRef = useRef<google.maps.ImageMapType | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const safetyOverlayRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const [localDirections, setLocalDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [weatherZones, setWeatherZones] = useState<WeatherZonePoint[]>([]);
  const [selectedWz, setSelectedWz] = useState<WeatherZonePoint | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedNews, setSelectedNews] = useState<(NewsAlert & { position: LatLng }) | null>(null);
  const [votedReports, setVotedReports] = useState<Set<string>>(new Set());
  const [selectedFamily, setSelectedFamily] = useState<FamilyMember | null>(null);
  const [zoom, setZoom] = useState(14);

  const center = cityCenter || userPosition;

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("zoom_changed", () => setZoom(map.getZoom() || 14));
  }, []);

  // Pan to city center on change
  useEffect(() => {
    if (mapRef.current && cityCenter) {
      mapRef.current.panTo(cityCenter);
      mapRef.current.setZoom(14);
    }
  }, [cityCenter?.lat, cityCenter?.lng]);

  // Auto-pan to real GPS position on first fix
  const firstGpsPanRef = useRef(false);
  useEffect(() => {
    if (userWatching && !firstGpsPanRef.current && mapRef.current) {
      firstGpsPanRef.current = true;
      mapRef.current.panTo(userPosition);
      mapRef.current.setZoom(15);
    }
  }, [userWatching, userPosition]);

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
          ? {
              transitOptions: {
                modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY, google.maps.TransitMode.TRAM, google.maps.TransitMode.RAIL],
                departureTime: new Date(), // real-time next departure
              },
            }
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

  // Pan once on mount
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(center);
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

  // Heatmap overlay (safety density)
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }
    if (!showHeatmap || reports.length === 0) return;

    const data = reports.map((r) => {
      const weight =
        r.type === "theft" ? 4 :
        r.type === "harassment" ? 4 :
        r.type === "danger" ? 3 :
        r.type === "dark_street" ? 2 : 1;
      return { location: new google.maps.LatLng(r.position.lat, r.position.lng), weight };
    });

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data,
      map: mapRef.current,
      radius: 60,
      opacity: 0.75,
      gradient: [
        "rgba(0,255,100,0)",
        "rgba(0,255,100,0.5)",
        "rgba(255,255,0,0.7)",
        "rgba(255,130,0,0.8)",
        "rgba(255,0,0,0.9)",
      ],
    });
  }, [isLoaded, showHeatmap, reports]);

  // ── Neighbourhood safety overlay (always visible, neighbourhood-scale) ──────
  // Combines user reports + geocoded crime news into a low-opacity colour layer.
  // Transparent = no risk · Yellow = some incidents · Orange = several · Red = many
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (safetyOverlayRef.current) { safetyOverlayRef.current.setMap(null); safetyOverlayRef.current = null; }

    const pts: google.maps.visualization.WeightedLocation[] = [];

    // User reports — safety-relevant types only
    for (const r of reports) {
      const w = r.type === "theft" || r.type === "harassment" ? 5
              : r.type === "danger" ? 3
              : r.type === "dark_street" ? 2 : 0;
      if (w > 0) pts.push({ location: new google.maps.LatLng(r.position.lat, r.position.lng), weight: w });
    }

    // Crime news with geocoded positions (higher weight — verified source)
    for (const n of newsAlerts) {
      if (n.category === "crime" && n.position) {
        pts.push({ location: new google.maps.LatLng(n.position.lat, n.position.lng), weight: 8 });
      }
    }

    if (pts.length === 0) return;

    safetyOverlayRef.current = new google.maps.visualization.HeatmapLayer({
      data: pts,
      map: mapRef.current,
      radius: 120,          // neighbourhood scale (~800m at zoom 14)
      opacity: 0.55,
      gradient: [
        "rgba(0,0,0,0)",            // no data → transparent
        "rgba(0,0,0,0)",
        "rgba(253,224,71,0.25)",    // very light yellow
        "rgba(250,204,21,0.38)",    // yellow
        "rgba(245,158,11,0.48)",    // amber
        "rgba(249,115,22,0.55)",    // orange
        "rgba(239,68,68,0.62)",     // red
      ],
    });
  }, [isLoaded, reports, newsAlerts]);

  const handleVote = async (vote: 1 | -1) => {
    if (!selectedReport) return;
    const rid = selectedReport.id;
    if (votedReports.has(rid)) return;
    setVotedReports((prev) => { const n = new Set(Array.from(prev)); n.add(rid); return n; });
    onVote(rid, vote);
    setSelectedReport(null);
  };

  const showReports = zoom >= 14;
  const visibleReports = reports.filter((r) => showReports || isNearRoute(r.position, localDirections));
  // News markers only shown when a route is active (to highlight dangers along the path)
  const newsMarkers = !routeActive ? [] : newsAlerts
    .filter((a) => a.category !== "general")
    .map((a, i) => ({
      ...a,
      position: a.position || NEWS_POSITIONS[i % NEWS_POSITIONS.length],
    }))
    .filter((a) => isNearRoute(a.position, localDirections));

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
      center={center}
      zoom={14}
      onLoad={onLoad}
      onClick={() => { setSelectedReport(null); setSelectedWz(null); setSelectedNews(null); setSelectedFamily(null); }}
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
        <Circle key={`wz${i}`} center={wz.position} radius={700}
          options={{ fillColor: wz.color, fillOpacity: 0.25, strokeColor: wz.color, strokeOpacity: 0.6, strokeWeight: 2, clickable: true }}
          onClick={() => { setSelectedWz(wz); setSelectedReport(null); }} />
      ))}
      {showRadar && weatherZones.map((wz, i) => (
        <Marker key={`wzl${i}`} position={wz.position}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
          label={{ text: `${Math.round(wz.temperature)}°`, color: wz.precipitation > 0 ? "#2563eb" : "#374151", fontSize: "11px", fontWeight: "bold" }}
          clickable={false} />
      ))}
      {selectedWz && (
        <InfoWindow position={selectedWz.position} onCloseClick={() => setSelectedWz(null)}>
          <div style={{ padding: 6, maxWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedWz.name}</div>
            <div style={{ fontSize: 20, fontWeight: 700, margin: "4px 0" }}>
              {Math.round(selectedWz.temperature)}°C <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>{selectedWz.label}</span>
            </div>
            {selectedWz.precipitation > 0 && <div style={{ fontSize: 11, color: "#2563eb" }}>Precipitazioni: {selectedWz.precipitation}mm</div>}
            <div style={{ fontSize: 11, color: "#64748b" }}>Vento: {Math.round(selectedWz.windSpeed)} km/h</div>
          </div>
        </InfoWindow>
      )}

      {/* User marker */}
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }} zIndex={100} />
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 25, fillColor: "#2563eb", fillOpacity: 0.15, strokeColor: "#2563eb", strokeWeight: 1, strokeOpacity: 0.3 }} zIndex={99} clickable={false} />

      {/* Reports */}
      {visibleReports.map((r) => {
        const cfg = REPORT_CONFIG[r.type];
        const conf = computeConfidence(r.confirms, r.denials);
        const opacity = Math.min(0.95, 0.5 + conf * 0.2);
        const alreadyVoted = votedReports.has(r.id);
        return (
          <Marker key={r.id} position={r.position}
            onClick={() => { setSelectedReport(r); setSelectedWz(null); setSelectedNews(null); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 13, fillColor: cfg.color, fillOpacity: opacity, strokeColor: "#fff", strokeWeight: 2 }}
            zIndex={50}
            opacity={alreadyVoted ? 0.6 : 1}
          />
        );
      })}
      {selectedReport && (() => {
        const cfg = REPORT_CONFIG[selectedReport.type];
        const conf = computeConfidence(selectedReport.confirms, selectedReport.denials);
        const ageMin = Math.round((Date.now() - selectedReport.timestamp.getTime()) / 60000);
        const alreadyVoted = votedReports.has(selectedReport.id);
        return (
          <InfoWindow position={selectedReport.position} onCloseClick={() => setSelectedReport(null)}>
            <div style={{ padding: "8px 4px", minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: "#fff", backgroundColor: cfg.color }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{ageMin < 60 ? `${ageMin} min fa` : `${Math.round(ageMin / 60)}h fa`}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11, color: "#64748b" }}>
                <span>✓ {selectedReport.confirms} conferme</span>
                <span>✗ {selectedReport.denials} smentite</span>
                <span style={{ color: conf > 1 ? "#10b981" : conf < 0.5 ? "#ef4444" : "#f59e0b" }}>
                  {Math.round(conf * 100)}% affidabile
                </span>
              </div>
              {alreadyVoted ? (
                <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", padding: "4px 0" }}>
                  Hai già votato questa segnalazione
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleVote(1)}
                    style={{ flex: 1, padding: "6px 0", background: "#dcfce7", color: "#16a34a", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    ✓ C&apos;è ancora
                  </button>
                  <button
                    onClick={() => handleVote(-1)}
                    style={{ flex: 1, padding: "6px 0", background: "#fee2e2", color: "#dc2626", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    ✗ Non c&apos;è più
                  </button>
                </div>
              )}
            </div>
          </InfoWindow>
        );
      })()}

      {/* News markers */}
      {newsMarkers.map((n) => {
        const cfg = NEWS_MARKER_CONFIG[n.category];
        if (!cfg) return null;
        return (
          <Marker key={`news-${n.id}`} position={n.position}
            onClick={() => { setSelectedNews(n); setSelectedReport(null); setSelectedWz(null); }}
            icon={{ path: "M-12,-12 L12,-12 L12,12 L-12,12 Z", scale: 1, fillColor: cfg.color, fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 2, anchor: new google.maps.Point(0, 0) }}
            zIndex={45} />
        );
      })}
      {selectedNews && NEWS_MARKER_CONFIG[selectedNews.category] && (
        <InfoWindow position={selectedNews.position} onCloseClick={() => setSelectedNews(null)}>
          <div style={{ padding: 6, maxWidth: 240 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: "#fff", backgroundColor: NEWS_MARKER_CONFIG[selectedNews.category].color }}>
              {NEWS_MARKER_CONFIG[selectedNews.category].label}
            </span>
            <p style={{ fontSize: 12, fontWeight: 600, margin: "6px 0 2px", lineHeight: 1.4 }}>{selectedNews.title}</p>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{selectedNews.source}</div>
            {selectedNews.url && (
              <a href={selectedNews.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#2563eb", fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                Leggi notizia →
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

      {/* Family members */}
      {familyMembers.map((member) => {
        const initials = member.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
        const ageMin = Math.round((Date.now() - new Date(member.updatedAt).getTime()) / 60000);
        return (
          <Marker
            key={`family-${member.userId}`}
            position={{ lat: member.lat, lng: member.lng }}
            onClick={() => { setSelectedFamily(member); setSelectedReport(null); setSelectedWz(null); setSelectedNews(null); }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: member.avatarColor,
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            }}
            label={{ text: initials, color: "#fff", fontSize: "10px", fontWeight: "bold" }}
            zIndex={90}
          />
        );
      })}
      {selectedFamily && (
        <InfoWindow
          position={{ lat: selectedFamily.lat, lng: selectedFamily.lng }}
          onCloseClick={() => setSelectedFamily(null)}
        >
          <div style={{ padding: "8px 4px", minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: selectedFamily.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                {selectedFamily.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedFamily.displayName}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  {(() => {
                    const ageMin = Math.round((Date.now() - new Date(selectedFamily.updatedAt).getTime()) / 60000);
                    return ageMin < 2 ? "Adesso" : ageMin < 60 ? `${ageMin} min fa` : `${Math.round(ageMin / 60)}h fa`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
