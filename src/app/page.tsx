"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LatLng, Report, ReportType, NewsAlert, SAFETY_TYPES } from "@/lib/types";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, getWeatherAlert, WeatherData, WeatherAlert } from "@/lib/weather";
import { CityInfo, loadCityFromStorage, saveCityToStorage } from "@/lib/cityData";
import { getSessionId } from "@/lib/session";
import { isReportActive } from "@/lib/geo";
import { createAuthClient } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { parseTransitSteps } from "@/lib/transitSteps";
import { getNeighbourhoods } from "@/lib/neighbourhoods";
import RoutePanel from "@/components/RoutePanel";
import RouteBottomSheet from "@/components/RouteBottomSheet";
import WeatherBar from "@/components/WeatherBar";
import ReportFAB from "@/components/ReportFAB";
import NavHUD from "@/components/NavHUD";
import Sidebar from "@/components/Sidebar";
import SOSButton from "@/components/SOSButton";
import GeolocationGate from "@/components/GeolocationGate";
import CitySelector from "@/components/CitySelector";

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
// Debug: log in browser console to verify key is loaded
if (typeof window !== "undefined") {
  console.log("[Salvo] Maps API key loaded:", API_KEY ? `${API_KEY.slice(0, 8)}...` : "MISSING ⚠️");
}

interface FamilyMember {
  userId: string;
  displayName: string;
  avatarColor: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

export default function Home() {
  const router = useRouter();

  // Auth state — must be resolved before rendering map
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Geolocation gate — initialise synchronously from localStorage so returning
  // users never get lazy=true, which would prevent watchPosition from starting.
  const [geoStarted, setGeoStarted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("geo_granted") === "1";
  });
  const { position, watching, recenter, permissionState, requestPermission } = useGeolocation(!geoStarted);

  const [city, setCity] = useState<CityInfo | null>(null);
  const [cityLoaded, setCityLoaded] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Route
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [mode, setMode] = useState<"WALKING" | "TRANSIT">("TRANSIT");
  const [routeActive, setRouteActive] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);

  // Transit steps for NavHUD
  const [transitSteps, setTransitSteps] = useState<ReturnType<typeof parseTransitSteps>>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const [navMode, setNavMode] = useState(false);
  const [dangerAlert, setDangerAlert] = useState<string | null>(null);
  const dangerAlertRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // News
  const [newsAlerts, setNewsAlerts] = useState<NewsAlert[]>([]);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<WeatherAlert | null>(null);

  // Family
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const familyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth check ────────────────────────────────────────────
  useEffect(() => {
    const supabase = createAuthClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => { if (data) setUserProfile(data as UserProfile); });
      }
      setAuthLoaded(true);
    });
  }, []);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (authLoaded && !userId) {
      router.replace("/auth/login");
    }
  }, [authLoaded, userId, router]);

  // ── Geolocation persistence ───────────────────────────────
  // Save grant to localStorage so next load starts non-lazy
  useEffect(() => {
    if (permissionState === "granted") {
      localStorage.setItem("geo_granted", "1");
    }
  }, [permissionState]);

  // ── City ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = loadCityFromStorage();
    if (stored) setCity(stored);
    setCityLoaded(true);
  }, []);

  // ── Reports ───────────────────────────────────────────────
  useEffect(() => {
    if (!city?.id) return;
    const load = () => {
      fetch(`/api/reports?cityId=${city.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.reports) setReports(d.reports.map((r: Report & { timestamp: string; expiresAt: string }) => ({
            ...r, timestamp: new Date(r.timestamp), expiresAt: new Date(r.expiresAt),
          })));
        }).catch(() => {});
    };
    load();
    const i = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(i);
  }, [city?.id]);

  // ── News (fetched when city changes, refreshed every 15 min) ─
  useEffect(() => {
    if (!city) return;
    const load = () => {
      fetch(`/api/news?city=${encodeURIComponent(city.name)}`)
        .then(r => r.json())
        .then(d => { if (d.alerts) setNewsAlerts(d.alerts); })
        .catch(() => {});
    };
    load();
    const i = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(i);
  }, [city?.name]);

  // ── Family location sharing ───────────────────────────────
  useEffect(() => {
    if (!userId || !city) return;

    const updateMyLocation = () => {
      if (permissionState === "granted") {
        fetch("/api/family/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, lat: position.lat, lng: position.lng }),
        }).catch(() => {});
      }
    };

    const loadFamilyMembers = () => {
      fetch(`/api/family?userId=${userId}`)
        .then(r => r.json())
        .then(d => {
          const members = (d.members || [])
            .filter((m: { location: { lat: number; lng: number; updated_at: string } | null; sharing_enabled: boolean }) => m.location && m.sharing_enabled)
            .map((m: { user_id: string; display_name: string; avatar_color: string; location: { lat: number; lng: number; updated_at: string } }) => ({
              userId: m.user_id,
              displayName: m.display_name,
              avatarColor: m.avatar_color,
              lat: m.location.lat,
              lng: m.location.lng,
              updatedAt: m.location.updated_at,
            }));
          setFamilyMembers(members);
        }).catch(() => {});
    };

    updateMyLocation();
    loadFamilyMembers();

    familyIntervalRef.current = setInterval(() => {
      updateMyLocation();
      loadFamilyMembers();
    }, 30 * 1000);

    return () => { if (familyIntervalRef.current) clearInterval(familyIntervalRef.current); };
  }, [userId, city?.id, position.lat, position.lng, permissionState]);

  // ── Prune expired reports ─────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => {
      setReports(prev => prev.filter(r => isReportActive(r.confirms, r.denials, r.expiresAt)));
    }, 60 * 1000);
    return () => clearInterval(i);
  }, []);

  // ── Weather ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const data = await fetchWeather(position);
      if (cancelled) return;
      setWeather(data);
      setWeatherAlert(data ? getWeatherAlert(data) : null);
      if (data && data.precipitation > 0) setShowRadar(true);
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [position.lat, position.lng]);

  useEffect(() => {
    const i = setInterval(async () => {
      const data = await fetchWeather(position);
      if (data) { setWeather(data); setWeatherAlert(getWeatherAlert(data)); }
    }, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [position.lat, position.lng]);

  // ── Danger zone detection (nav mode) ─────────────────────
  const lastDangerCheckRef = useRef(0);
  useEffect(() => {
    if (!navMode || !city) return;
    const now = Date.now();
    if (now - lastDangerCheckRef.current < 12000) return;
    lastDangerCheckRef.current = now;
    const hoods = getNeighbourhoods(city.name);
    const R = 6371000;
    for (const n of hoods) {
      const dLat = ((n.lat - position.lat) * Math.PI) / 180;
      const dLng = ((n.lng - position.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((position.lat * Math.PI) / 180) * Math.cos((n.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < n.radius) {
        let score = 0;
        for (const r of reports) {
          const dd = ((r.position.lat - n.lat) ** 2 + (r.position.lng - n.lng) ** 2) ** 0.5 * 111000;
          if (dd < n.radius) score += r.type === "theft" || r.type === "harassment" ? 5 : r.type === "danger" ? 3 : 1;
        }
        for (const na of newsAlerts) {
          if ((na.category === "crime" || na.category === "transport") && na.position) {
            const dd = ((na.position.lat - n.lat) ** 2 + (na.position.lng - n.lng) ** 2) ** 0.5 * 111000;
            if (dd < n.radius) score += 8;
          }
        }
        if (score >= 6) {
          const msg = `Stai entrando in ${n.name}${score >= 15 ? " — zona ad alto rischio" : " — zona a rischio"}`;
          setDangerAlert(msg);
          if (dangerAlertRef.current) clearTimeout(dangerAlertRef.current);
          dangerAlertRef.current = setTimeout(() => setDangerAlert(null), 6000);
          break;
        }
      }
    }
  }, [position.lat, position.lng, navMode]);

  // ── ETA (computed once, shown in nav bar) ─────────────────
  const etaTime = useMemo(() => {
    if (!routeInfo?.duration) return null;
    // Try last transit step arrival timestamp first
    const lastStep = transitSteps[transitSteps.length - 1];
    if (lastStep?.arrivalTimestamp) {
      return new Date(lastStep.arrivalTimestamp * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    // Fallback: parse duration string
    const h = parseInt((routeInfo.duration.match(/(\d+)\s*or[ae]/) || [])[1] || "0");
    const m = parseInt((routeInfo.duration.match(/(\d+)\s*min/) || [])[1] || "0");
    const eta = new Date(Date.now() + (h * 60 + m) * 60000);
    return eta.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }, [routeInfo, transitSteps]);

  // ── Handlers ──────────────────────────────────────────────
  const handleDirectionsChange = useCallback((result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => {
    setDirections(result);
    setRouteInfo(info);
    setSelectedRouteIndex(0);
    setTransitSteps(result ? parseTransitSteps(result, 0) : []);
  }, []);

  const handleRouteSelect = useCallback((idx: number) => {
    setSelectedRouteIndex(idx);
    if (directions?.routes?.[idx]) {
      const leg = directions.routes[idx].legs[0];
      setRouteInfo(leg ? { distance: leg.distance?.text || "", duration: leg.duration?.text || "" } : null);
      setTransitSteps(parseTransitSteps(directions, idx));
    }
  }, [directions]);

  const handleReport = useCallback(async (type: ReportType) => {
    const sid = getSessionId();
    const pos: LatLng = { lat: position.lat, lng: position.lng };
    const tempId = `temp-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    setReports(prev => [{
      id: tempId, type, position: pos, timestamp: new Date(),
      confirms: 0, denials: 0, expiresAt, sessionId: sid, upvotes: 0,
    }, ...prev]);

    if (city?.id) {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cityId: city.id, type, lat: pos.lat, lng: pos.lng, sessionId: sid, userId: userId || undefined }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) {
            setReports(prev => prev.map(r => r.id === tempId ? { ...r, id: data.report.id } : r));
          }
        }
      } catch { /* keep optimistic */ }
    }
  }, [position, city?.id, userId]);

  const handleVote = useCallback(async (reportId: string, vote: 1 | -1) => {
    const sid = getSessionId();
    setReports(prev => prev.map(r =>
      r.id === reportId
        ? { ...r, confirms: vote === 1 ? r.confirms + 1 : r.confirms, denials: vote === -1 ? r.denials + 1 : r.denials }
        : r
    ));
    await fetch(`/api/reports/${reportId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, vote, userId: userId || undefined }),
    }).catch(() => {});
  }, [userId]);

  const handleCitySelect = useCallback((selected: CityInfo) => {
    setCity(selected);
    saveCityToStorage(selected);
    setReports([]);
    setShowCitySelector(false);
  }, []);

  const handleClear = useCallback(() => {
    setOrigin(null); setDestination(null); setOriginText(""); setDestText("");
    setRouteActive(false); setRouteInfo(null); setDirections(null); setRouteOpen(false);
    setSelectedRouteIndex(0); setShowRouteSheet(false); setNavMode(false); setDangerAlert(null);
  }, []);

  // ── Render guards ─────────────────────────────────────────

  // While checking auth show a loading screen
  if (!authLoaded) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #061826 0%, #0A2438 60%, #061826 100%)" }}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center" style={{ background: "#05C3B2" }}>
            <img src="/logo.svg" alt="Salvo" className="w-10 h-10" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <p className="text-white/60 text-xs tracking-[0.25em] uppercase font-semibold">Salvo</p>
          <div
            className="w-7 h-7 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#05C3B2", borderTopColor: "transparent", animation: "salvoSpin 0.8s linear infinite" }}
          />
        </div>
      </div>
    );
  }

  // Redirect handled by useEffect above; show nothing while navigating
  if (!userId) return null;

  if (!cityLoaded) return null;
  if (!city && !showCitySelector) {
    return <CitySelector onSelect={handleCitySelect} />;
  }
  if (showCitySelector) {
    return <CitySelector onSelect={handleCitySelect} />;
  }

  const cityCenter: LatLng = { lat: city!.lat, lng: city!.lng };
  const showGeoGate = !geoStarted && permissionState !== "granted";

  const handleGeoAllow = () => {
    setGeoStarted(true);
    requestPermission();
    localStorage.setItem("geo_granted", "1");
  };

  const handleGeoSkip = () => {
    setGeoStarted(true);
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-900">
      {/* Geo permission gate (overlay, map already visible behind) */}
      {showGeoGate && (
        <GeolocationGate onAllow={handleGeoAllow} onSkip={handleGeoSkip} />
      )}

      {/* Map */}
      <MapPanel
        apiKey={API_KEY}
        userPosition={position}
        userWatching={watching}
        cityCenter={cityCenter}
        cityName={city?.name}
        reports={reports}
        newsAlerts={newsAlerts}
        showRadar={showRadar}
        showTraffic={showTraffic}
        showHeatmap={showHeatmap}
        directions={directions}
        onDirectionsChange={handleDirectionsChange}
        routeOrigin={origin || position}
        routeDestination={destination}
        routeMode={mode}
        routeActive={routeActive}
        selectedRouteIndex={selectedRouteIndex}
        onRouteSelect={handleRouteSelect}
        onVote={handleVote}
        familyMembers={familyMembers}
        navMode={navMode}
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        city={city}
        onCityChange={() => { setSidebarOpen(false); setShowCitySelector(true); }}
      />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 px-3 flex flex-col gap-2"
        style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}
      >
        <div className="flex items-center gap-2 pt-1">
          {/* Hamburger / brand mark */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="ctrl-ocean w-11 h-11 rounded-2xl flex items-center justify-center transition shrink-0 overflow-hidden active:scale-90"
          >
            <img src="/logo.svg" alt="Salvo" className="w-6 h-6" />
          </button>

          {/* Route search toggle */}
          <button
            onClick={() => setRouteOpen(!routeOpen)}
            className="flex-1 glass rounded-2xl shadow-lg px-3 h-11 flex items-center gap-2 transition"
            style={routeActive ? { border: "2px solid #05C3B2" } : {}}
          >
            {routeActive ? (
              <>
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#05C3B2" }}>route</span>
                <span className="text-sm font-semibold text-gray-800 truncate">{routeInfo?.duration} · {routeInfo?.distance}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-gray-400 text-[18px]">search</span>
                <span className="text-sm text-gray-400">Dove vuoi andare?</span>
              </>
            )}
          </button>

          {/* Weather pill */}
          {weather && (
            <button
              onClick={() => setShowRadar(!showRadar)}
              className="ctrl-ocean rounded-2xl h-11 px-3 flex items-center gap-1.5 shrink-0 transition active:scale-90"
              style={showRadar
                ? { backgroundColor: "#05C3B2", borderColor: "#05C3B2", color: "white" }
                : { color: "rgba(255,255,255,0.85)" }}
            >
              <span className="material-symbols-outlined text-[18px]">{weather.precipitation > 0 ? "rainy" : "wb_sunny"}</span>
              <span className="text-xs font-bold">{Math.round(weather.temperature)}°</span>
            </button>
          )}
        </div>

        {/* Route panel (expanded) */}
        {routeOpen && (
          <RoutePanel
            origin={origin}
            destination={destination}
            originText={originText}
            destinationText={destText}
            mode={mode}
            routeInfo={routeInfo}
            onOriginSelect={(pos, text) => { setOrigin(pos); setOriginText(text); setRouteActive(!!destination); }}
            onDestinationSelect={(pos, text) => { setDestination(pos); setDestText(text); setRouteActive(true); setRouteOpen(false); setShowRouteSheet(true); }}
            onModeChange={setMode}
            onUseMyLocation={() => { setOrigin(position); setOriginText("La mia posizione"); }}
            onClear={handleClear}
            apiLoaded={!!API_KEY}
            city={city}
            reports={reports}
            newsAlerts={newsAlerts}
            directions={directions}
            selectedRouteIndex={selectedRouteIndex}
            onRouteSelect={handleRouteSelect}
          />
        )}

        {/* Weather alert */}
        {weatherAlert && (
          <WeatherBar weather={weather} alert={weatherAlert} />
        )}
      </div>

      {/* Map controls — right side */}
      <div className="absolute right-3 z-20 flex flex-col gap-2" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>
        <button
          onClick={recenter}
          className="ctrl-ocean rounded-2xl w-11 h-11 flex items-center justify-center transition active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: "#05C3B2" }}>my_location</span>
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="ctrl-ocean rounded-2xl w-11 h-11 flex items-center justify-center transition active:scale-90"
          style={showHeatmap ? { backgroundColor: "#ef4444", borderColor: "#ef4444" } : {}}
          title="Mappa pericoli"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: showHeatmap ? "white" : "#ef4444" }}>local_fire_department</span>
        </button>
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className="ctrl-ocean rounded-2xl w-11 h-11 flex items-center justify-center transition active:scale-90"
          style={showTraffic ? { backgroundColor: "#F0A500", borderColor: "#F0A500" } : {}}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: showTraffic ? "white" : "#F0A500" }}>traffic</span>
        </button>
      </div>

      {/* SOS modal */}
      {showSOS && (
        <SOSButton
          userPosition={position}
          userProfile={userProfile}
          userId={userId}
          forceOpen
          onClose={() => setShowSOS(false)}
        />
      )}

      {/* Live navigation HUD — hidden when sidebar overlaps */}
      <NavHUD
        steps={transitSteps}
        userPosition={position}
        watching={watching}
        routeActive={routeActive && mode === "TRANSIT"}
        hidden={sidebarOpen}
      />

      {/* Floating report FAB + SOS pill */}
      <ReportFAB
        onReport={handleReport}
        onSOSOpen={() => setShowSOS(true)}
        navMode={navMode}
      />

      {/* ── Nav mode: danger zone alert ─────────────────────── */}
      {navMode && dangerAlert && (
        <div
          className="fixed z-[85] left-0 right-0 flex justify-center animate-fade-in-up"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 110px)" }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl mx-4"
            style={{
              background: "rgba(239,68,68,0.95)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 24px rgba(239,68,68,0.5)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span className="material-symbols-outlined text-white text-[20px]">warning</span>
            <span className="text-white font-bold text-sm">{dangerAlert}</span>
          </div>
        </div>
      )}

      {/* ── Nav mode: ETA bottom bar ─────────────────────────── */}
      {navMode && routeInfo && etaTime && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[80] flex justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
        >
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-2xl w-full max-w-sm"
            style={{
              background: "rgba(6,24,38,0.93)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              border: "1px solid rgba(5,195,178,0.2)",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {/* ETA */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(5,195,178,0.7)" }}>Arrivo</span>
              <span className="text-white font-black text-2xl leading-none">{etaTime}</span>
            </div>
            {/* Divider */}
            <div className="w-px self-stretch rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            {/* Route info + dest */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {routeInfo.duration} · {routeInfo.distance}
              </div>
              <div className="text-sm font-bold text-white truncate">{destText}</div>
            </div>
            {/* Stop nav */}
            <button
              onClick={handleClear}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#ef4444" }}>close</span>
            </button>
          </div>
        </div>
      )}

      {/* Waze-style full-screen route picker */}
      {showRouteSheet && directions && (
        <RouteBottomSheet
          directions={directions}
          selectedRouteIndex={selectedRouteIndex}
          onRouteSelect={handleRouteSelect}
          onConfirm={() => { setShowRouteSheet(false); setNavMode(true); }}
          onDismiss={handleClear}
          reports={reports}
          newsAlerts={newsAlerts}
          originText={originText || "La mia posizione"}
          destinationText={destText}
          mode={mode}
        />
      )}
    </div>
  );
}
