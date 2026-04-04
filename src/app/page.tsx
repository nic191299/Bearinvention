"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { LatLng, Report, ReportType, NewsAlert, SAFETY_TYPES } from "@/lib/types";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, getWeatherAlert, WeatherData, WeatherAlert } from "@/lib/weather";
import { CityInfo, loadCityFromStorage } from "@/lib/cityData";
import { getSessionId } from "@/lib/session";
import { isReportActive } from "@/lib/geo";
import RoutePanel from "@/components/RoutePanel";
import WeatherBar from "@/components/WeatherBar";
import NewsAlerts from "@/components/NewsAlerts";
import ReportIcons from "@/components/ReportIcons";
import ChatBot from "@/components/ChatBot";
import SOSButton from "@/components/SOSButton";
import CitySelector from "@/components/CitySelector";

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function Home() {
  const { position, recenter } = useGeolocation();
  const [city, setCity] = useState<CityInfo | null>(null);
  const [cityLoaded, setCityLoaded] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Route state
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [mode, setMode] = useState<"WALKING" | "TRANSIT">("TRANSIT");
  const [routeActive, setRouteActive] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  // News
  const [newsAlerts, setNewsAlerts] = useState<NewsAlert[]>([]);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<WeatherAlert | null>(null);

  // Load city from storage on mount
  useEffect(() => {
    const stored = loadCityFromStorage();
    if (stored) setCity(stored);
    setCityLoaded(true);
  }, []);

  // Fetch reports when city changes
  useEffect(() => {
    if (!city?.id) return;
    fetch(`/api/reports?cityId=${city.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.reports) setReports(data.reports.map((r: Report & { timestamp: string; expiresAt: string }) => ({
          ...r,
          timestamp: new Date(r.timestamp),
          expiresAt: new Date(r.expiresAt),
        })));
      })
      .catch(console.error);

    // Refresh every 2 min
    const i = setInterval(() => {
      fetch(`/api/reports?cityId=${city.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.reports) setReports(data.reports.map((r: Report & { timestamp: string; expiresAt: string }) => ({
            ...r,
            timestamp: new Date(r.timestamp),
            expiresAt: new Date(r.expiresAt),
          })));
        })
        .catch(console.error);
    }, 2 * 60 * 1000);
    return () => clearInterval(i);
  }, [city?.id]);

  // Prune expired reports from local state
  useEffect(() => {
    const i = setInterval(() => {
      setReports((prev) => prev.filter((r) => isReportActive(r.confirms, r.denials, r.expiresAt)));
    }, 60 * 1000);
    return () => clearInterval(i);
  }, []);

  // Weather
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const data = await fetchWeather(position);
      if (cancelled) return;
      setWeather(data);
      setWeatherAlert(data ? getWeatherAlert(data) : null);
      if (data && data.precipitation > 0) setShowRadar(true);
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [position.lat, position.lng]);

  useEffect(() => {
    const i = setInterval(async () => {
      const data = await fetchWeather(position);
      if (data) { setWeather(data); setWeatherAlert(getWeatherAlert(data)); }
    }, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [position.lat, position.lng]);

  const handleDirectionsChange = useCallback((result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => {
    setDirections(result);
    setRouteInfo(info);
  }, []);

  const handleReport = useCallback(async (type: ReportType) => {
    const sid = getSessionId();
    const pos: LatLng = {
      lat: position.lat + (Math.random() - 0.5) * 0.001,
      lng: position.lng + (Math.random() - 0.5) * 0.001,
    };

    // Optimistic local update
    const tempId = `temp-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    setReports((prev) => [{
      id: tempId,
      type,
      position: pos,
      timestamp: new Date(),
      confirms: 0,
      denials: 0,
      expiresAt,
      sessionId: sid,
      upvotes: 0,
    }, ...prev]);

    // Persist to Supabase
    if (city?.id) {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cityId: city.id, type, lat: pos.lat, lng: pos.lng, sessionId: sid }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) {
            // Replace temp with real
            setReports((prev) => prev.map((r) =>
              r.id === tempId ? { ...r, id: data.report.id } : r
            ));
          }
        }
      } catch (err) {
        console.error("Failed to save report:", err);
      }
    }
  }, [position, city?.id]);

  const handleVote = useCallback(async (reportId: string, vote: 1 | -1) => {
    const sid = getSessionId();
    // Optimistic update
    setReports((prev) => prev.map((r) =>
      r.id === reportId
        ? { ...r, confirms: vote === 1 ? r.confirms + 1 : r.confirms, denials: vote === -1 ? r.denials + 1 : r.denials }
        : r
    ));
    await fetch(`/api/reports/${reportId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, vote }),
    }).catch(console.error);
  }, []);

  const handleCitySelect = useCallback((selectedCity: CityInfo) => {
    setCity(selectedCity);
    setReports([]); // clear old city reports
  }, []);

  const handleClear = useCallback(() => {
    setOrigin(null); setDestination(null); setOriginText(""); setDestText("");
    setRouteActive(false); setRouteInfo(null); setDirections(null);
  }, []);

  // Show city selector on first load if no city stored
  if (!cityLoaded) return null; // avoid flash

  if (!city) {
    return <CitySelector onSelect={handleCitySelect} />;
  }

  const cityCenter: LatLng = { lat: city.lat, lng: city.lng };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Full-screen map */}
      <MapPanel
        apiKey={API_KEY}
        userPosition={position}
        cityCenter={cityCenter}
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
        onVote={handleVote}
      />

      {/* TOP: Route + Weather + News */}
      <div className="absolute top-3 left-16 right-3 md:left-20 md:right-4 z-10 flex flex-col gap-2 max-w-[480px]">
        <RoutePanel
          origin={origin}
          destination={destination}
          originText={originText}
          destinationText={destText}
          mode={mode}
          routeInfo={routeInfo}
          onOriginSelect={(pos, text) => { setOrigin(pos); setOriginText(text); setRouteActive(!!destination); }}
          onDestinationSelect={(pos, text) => { setDestination(pos); setDestText(text); setRouteActive(true); }}
          onModeChange={setMode}
          onUseMyLocation={() => { setOrigin(position); setOriginText("La mia posizione"); }}
          onClear={handleClear}
          apiLoaded={!!API_KEY}
          city={city}
          reports={reports}
        />
        <WeatherBar weather={weather} alert={weatherAlert} />
        <NewsAlerts onAlerts={setNewsAlerts} city={city.name} />
      </div>

      {/* LEFT: Report buttons */}
      <ReportIcons userPosition={position} onReport={handleReport} />

      {/* BOTTOM-RIGHT: Map layer toggles */}
      <div className="absolute bottom-20 md:bottom-6 right-3 z-20 flex flex-col gap-2">
        <button
          onClick={recenter}
          className="glass shadow-lg rounded-full w-11 h-11 flex items-center justify-center hover:bg-white transition"
        >
          <span className="material-symbols-outlined text-blue-600 text-[20px]">my_location</span>
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`shadow-lg rounded-full w-11 h-11 flex items-center justify-center transition ${showHeatmap ? "bg-red-500 text-white" : "glass hover:bg-white"}`}
          title="Mappa sicurezza"
        >
          <span className={`material-symbols-outlined text-[20px] ${showHeatmap ? "" : "text-red-500"}`}>local_fire_department</span>
        </button>
        <button
          onClick={() => setShowRadar(!showRadar)}
          className={`shadow-lg rounded-full w-11 h-11 flex items-center justify-center transition ${showRadar ? "bg-blue-600 text-white" : "glass hover:bg-white"}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${showRadar ? "" : "text-blue-600"}`}>rainy</span>
        </button>
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`shadow-lg rounded-full w-11 h-11 flex items-center justify-center transition ${showTraffic ? "bg-orange-500 text-white" : "glass hover:bg-white"}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${showTraffic ? "" : "text-orange-500"}`}>traffic</span>
        </button>
      </div>

      {/* BOTTOM-LEFT: Chatbot + SOS */}
      <button
        onClick={() => setChatOpen(true)}
        className="absolute bottom-20 md:bottom-6 left-3 z-20 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700 transition active:scale-90"
        style={{ width: 48, height: 48 }}
      >
        <span className="material-symbols-outlined text-[22px]">smart_toy</span>
      </button>
      <SOSButton userPosition={position} />

      {/* BRANDING + City selector shortcut */}
      <div className="absolute top-3 left-3 z-10 glass rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
        <img src="/logo.svg" alt="BearInvention" className="w-7 h-7" />
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-gray-800 leading-none">BearInvention</div>
          <button
            onClick={() => { if (typeof window !== "undefined") { localStorage.removeItem("bear_city"); setCity(null); } }}
            className="text-[9px] text-blue-500 hover:text-blue-700 transition flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[9px]">location_on</span>
            {city.name}
          </button>
        </div>
      </div>

      {/* Community button */}
      <Link
        href={`/community?city=${encodeURIComponent(city.name)}`}
        className="absolute bottom-20 md:bottom-6 left-14 z-20 glass rounded-full shadow-lg w-12 h-12 flex items-center justify-center hover:bg-white transition"
        title="Community"
      >
        <span className="material-symbols-outlined text-[20px] text-indigo-600">forum</span>
      </Link>

      {/* Chat */}
      <ChatBot
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userPosition={position}
        weather={weather}
      />
    </div>
  );
}
