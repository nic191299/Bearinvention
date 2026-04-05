"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getNeighbourhoods, Neighbourhood } from "@/lib/neighbourhoods";

const libraries: ("places" | "visualization")[] = ["places", "visualization"];

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels", stylers: [{ visibility: "on" }] },
  // Hide individual transit vehicle icons that clutter the map
  { featureType: "transit.line", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function neighbourhoodDanger(n: Neighbourhood, reports: Report[], newsAlerts: NewsAlert[]): { fillColor: string; fillOpacity: number; strokeColor: string } {
  let score = 0;
  const thresh = n.radius * 1.4;
  for (const r of reports) {
    if (haversine(r.position.lat, r.position.lng, n.lat, n.lng) < thresh) {
      score += r.type === "theft" || r.type === "harassment" ? 5
             : r.type === "danger" ? 3
             : r.type === "dark_street" ? 2 : 1;
    }
  }
  for (const news of newsAlerts) {
    if (!news.position) continue;
    const w = news.category === "crime" ? 8 : news.category === "transport" || news.category === "road_closure" ? 3 : 0;
    if (w > 0 && haversine(news.position.lat, news.position.lng, n.lat, n.lng) < thresh) score += w;
  }
  if (score === 0)  return { fillColor: "#10b981", fillOpacity: 0.06,  strokeColor: "#10b981" };
  if (score < 6)   return { fillColor: "#facc15", fillOpacity: 0.15,  strokeColor: "#facc15" };
  if (score < 15)  return { fillColor: "#f97316", fillOpacity: 0.22,  strokeColor: "#f97316" };
  return                   { fillColor: "#ef4444", fillOpacity: 0.28,  strokeColor: "#ef4444" };
}

// Point N metres ahead of pos in the given heading — used to put user
// in the lower part of the viewport during navigation.
function lookAheadPoint(pos: LatLng, headingDeg: number, distanceM: number): LatLng {
  const R = 6371000;
  const d = distanceM / R;
  const h = (headingDeg * Math.PI) / 180;
  const lat1 = (pos.lat * Math.PI) / 180;
  const lng1 = (pos.lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(h));
  const lng2 = lng1 + Math.atan2(
    Math.sin(h) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function computeBearing(from: LatLng, to: LatLng): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
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
  cityName?: string;
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
  selectedRouteIndex?: number;
  onRouteSelect?: (idx: number) => void;
  onVote: (reportId: string, vote: 1 | -1) => void;
  familyMembers?: FamilyMember[];
  navMode?: boolean;
}

export default function MapPanel({
  apiKey,
  userPosition,
  userWatching = false,
  cityCenter,
  cityName,
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
  selectedRouteIndex = 0,
  onRouteSelect,
  onVote,
  familyMembers = [],
  navMode = false,
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
  const prevPosRef = useRef<LatLng | null>(null);

  const center = cityCenter || userPosition;

  // Neighbourhood circles — always shown when city is loaded (news-based danger)
  const neighbourhoods = useMemo(
    () => (cityName ? getNeighbourhoods(cityName) : []),
    [cityName]
  );

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

  // Auto-pan to real GPS position on first fix (not during nav mode — camera handled separately)
  const firstGpsPanRef = useRef(false);
  useEffect(() => {
    if (navMode) return; // nav mode handles camera
    if (userWatching && !firstGpsPanRef.current && mapRef.current) {
      firstGpsPanRef.current = true;
      mapRef.current.panTo(userPosition);
      mapRef.current.setZoom(15);
    }
  }, [navMode, userWatching, userPosition]);

  // ── Nav mode: Waze-style camera ───────────────────────────────────────────
  // Perspective tilt is handled entirely by CSS transform on the container div.
  // Here we handle: heading rotation (setHeading works on roadmap), zoom,
  // and panning to a look-ahead point so the user's dot sits near the bottom.
  useEffect(() => {
    if (!navMode || !mapRef.current) return;
    const map = mapRef.current;
    map.setZoom(18);

    if (!userWatching) return;
    let bearing = map.getHeading() || 0;
    if (prevPosRef.current) {
      const dist = haversine(prevPosRef.current.lat, prevPosRef.current.lng, userPosition.lat, userPosition.lng);
      if (dist > 3) bearing = computeBearing(prevPosRef.current, userPosition);
    }
    prevPosRef.current = { ...userPosition };
    map.setHeading(bearing);
    // Pan to a point 120m ahead so the user's indicator sits at the bottom
    const ahead = lookAheadPoint(userPosition, bearing, 120);
    map.panTo(ahead);
  }, [navMode, userPosition, userWatching]);

  // Reset camera when leaving nav mode
  useEffect(() => {
    if (navMode || !mapRef.current) return;
    const map = mapRef.current;
    map.setHeading(0);
    map.setZoom(14);
    prevPosRef.current = null;
    firstGpsPanRef.current = false;
  }, [navMode]);

  // Weather zones
  useEffect(() => {
    if (!showRadar) { setWeatherZones([]); return; }
    fetchWeatherZones().then(setWeatherZones);
    const i = setInterval(() => fetchWeatherZones().then(setWeatherZones), 10 * 60 * 1000);
    return () => clearInterval(i);
  }, [showRadar]);

  // Directions — skip entirely during active navigation to prevent reloading
  useEffect(() => {
    if (navMode) return;
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
  }, [isLoaded, routeOrigin, routeDestination, routeMode, routeActive, navMode, onDirectionsChange]);

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
          // RainViewer free tier supports up to zoom 6 natively.
          // For higher zoom levels, scale coordinates to the parent zoom-6 tile.
          const maxNativeZ = 6;
          const cz = Math.min(z, maxNativeZ);
          const scale = Math.pow(2, z - cz);
          return url
            .replace("{z}", String(cz))
            .replace("{x}", String(Math.floor(coord.x / scale)))
            .replace("{y}", String(Math.floor(coord.y / scale)));
        },
        tileSize: new google.maps.Size(256, 256),
        minZoom: 0,
        maxZoom: 18,
        opacity: 0.55,
        name: "Radar",
      });
      mapRef.current.overlayMapTypes.push(layer);
      radarRef.current = layer;
    });
  }, [isLoaded, showRadar]);

  // Heatmap overlay — user reports + all geolocated news
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    if (!showHeatmap) return;

    const data: google.maps.visualization.WeightedLocation[] = [];

    // User reports
    for (const r of reports) {
      const weight = r.type === "theft" || r.type === "harassment" ? 5 : r.type === "danger" ? 3 : r.type === "dark_street" ? 2 : 1;
      data.push({ location: new google.maps.LatLng(r.position.lat, r.position.lng), weight });
    }

    // All news with geocoded positions (crime = highest weight)
    for (const n of newsAlerts) {
      if (!n.position) continue;
      const w = n.category === "crime" ? 8 : n.category === "transport" || n.category === "road_closure" ? 4 : 2;
      data.push({ location: new google.maps.LatLng(n.position.lat, n.position.lng), weight: w });
    }

    // Fallback: if no real data, seed with low-weight news-position proxies so heatmap is visible
    if (data.length === 0) {
      for (const pos of NEWS_POSITIONS) {
        data.push({ location: new google.maps.LatLng(pos.lat, pos.lng), weight: 1 });
      }
    }

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data,
      map: mapRef.current,
      radius: 60,
      opacity: 0.75,
      gradient: [
        "rgba(0,0,0,0)",
        "rgba(0,200,100,0.4)",
        "rgba(255,255,0,0.6)",
        "rgba(255,130,0,0.75)",
        "rgba(255,0,0,0.9)",
      ],
    });
  }, [isLoaded, showHeatmap, reports, newsAlerts]);

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

  // ── Weather: group by condition, one large circle per type ──────────────────
  const weatherGroups = useMemo(() => {
    if (!weatherZones.length) return [];
    const groups: Record<string, WeatherZonePoint[]> = {};
    for (const wz of weatherZones) {
      const key = wz.color; // same color = same condition
      if (!groups[key]) groups[key] = [];
      groups[key].push(wz);
    }
    const R = 6371000;
    return Object.values(groups).map((zones) => {
      const lat = zones.reduce((s, z) => s + z.position.lat, 0) / zones.length;
      const lng = zones.reduce((s, z) => s + z.position.lng, 0) / zones.length;
      let maxD = 0;
      for (const z of zones) {
        const dLat = (z.position.lat - lat) * Math.PI / 180;
        const dLng = (z.position.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(z.position.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (d > maxD) maxD = d;
      }
      return {
        position: { lat, lng },
        radius: Math.max(maxD + 4000, 5000), // cover all points + 4km buffer, min 5km
        color: zones[0].color,
        label: zones[0].label,
        icon: zones[0].icon,
        precipitation: Math.max(...zones.map(z => z.precipitation)),
        windSpeed: Math.round(zones.reduce((s, z) => s + z.windSpeed, 0) / zones.length),
      };
    });
  }, [weatherZones]);

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
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#061826" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent" style={{ borderColor: "#05C3B2", borderTopColor: "transparent", animation: "salvoSpin 0.8s linear infinite" }} />
      </div>
    );
  }

  // CSS perspective transform creates the Waze/Maps navigation perspective.
  // We extend the map container 28% above the viewport so the receding top
  // fills naturally after the rotateX transform.
  const navPerspectiveStyle: React.CSSProperties = navMode ? {
    position: "absolute",
    top: "-28%",
    left: 0, right: 0, bottom: 0,
    transformOrigin: "50% 100%",
    transform: "perspective(480px) rotateX(44deg)",
    transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
  } : {
    position: "absolute",
    inset: 0,
    transformOrigin: "50% 100%",
    transform: "none",
    transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#061826" }}>
      {/* Perspective wrapper — CSS-only tilt, roadmap stays roadmap */}
      <div style={navPerspectiveStyle}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={14}
          onLoad={onLoad}
          onClick={() => { setSelectedReport(null); setSelectedWz(null); setSelectedNews(null); setSelectedFamily(null); }}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: !navMode,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
            gestureHandling: navMode ? "none" : "greedy", // lock gestures during nav
            clickableIcons: false,
          }}
        >
      {showTraffic && <TrafficLayer />}

      {/* Weather: one large circle per condition type + label marker */}
      {showRadar && weatherGroups.map((g, i) => (
        <Circle key={`wg${i}`} center={g.position} radius={g.radius}
          options={{ fillColor: g.color, fillOpacity: 0.18, strokeColor: g.color, strokeOpacity: 0.5, strokeWeight: 1.5, clickable: false }} />
      ))}
      {showRadar && weatherGroups.map((g, i) => (
        <Marker key={`wgl${i}`} position={g.position} clickable={false}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
          label={{ text: g.label, color: "#1e293b", fontSize: "11px", fontWeight: "700" }} />
      ))}

      {/* User marker */}
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#05C3B2", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }} zIndex={100} />
      <Marker position={userPosition} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 25, fillColor: "#05C3B2", fillOpacity: 0.15, strokeColor: "#05C3B2", strokeWeight: 1, strokeOpacity: 0.3 }} zIndex={99} clickable={false} />

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

      {/* Neighbourhood safety circles — coloured by danger score, shown when route is active */}
      {neighbourhoods.map((n, i) => {
        const { fillColor, fillOpacity, strokeColor } = neighbourhoodDanger(n, reports, newsAlerts);
        return (
          <Circle
            key={`nh-${i}`}
            center={{ lat: n.lat, lng: n.lng }}
            radius={n.radius}
            options={{
              fillColor,
              fillOpacity,
              strokeColor,
              strokeOpacity: fillOpacity * 1.8,
              strokeWeight: 1.5,
              clickable: false,
              zIndex: 2,
            }}
          />
        );
      })}

      {/* Directions — render all alternatives, highlight selected */}
      {localDirections && localDirections.routes.map((_, routeIdx) => {
        const isSelected = routeIdx === selectedRouteIndex;
        return (
          <DirectionsRenderer
            key={`route-${routeIdx}`}
            directions={localDirections}
            options={{
              routeIndex: routeIdx,
              suppressMarkers: !isSelected,
              polylineOptions: {
                strokeColor: isSelected ? "#05C3B2" : "#94a3b8",
                strokeWeight: isSelected ? 5 : 3,
                strokeOpacity: isSelected ? 0.9 : 0.4,
                zIndex: isSelected ? 10 : 1,
              },
            }}
          />
        );
      })}

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
      </div>

      {/* Horizon gradient — softens the receding top in nav mode */}
      {navMode && (
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none z-[5]"
          style={{
            height: "22%",
            background: "linear-gradient(to bottom, rgba(6,24,38,0.55) 0%, transparent 100%)",
          }}
        />
      )}
    </div>
  );
}
