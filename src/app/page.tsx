"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { LatLng, Report, NewsAlert } from "@/lib/types";
import { initialReports } from "@/lib/mockData";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, getWeatherAlert, WeatherData, WeatherAlert } from "@/lib/weather";
import RoutePanel from "@/components/RoutePanel";
import WeatherBar from "@/components/WeatherBar";
import NewsAlerts from "@/components/NewsAlerts";
import ReportIcons from "@/components/ReportIcons";
import ChatBot from "@/components/ChatBot";

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function Home() {
  const { position, recenter } = useGeolocation();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [chatOpen, setChatOpen] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

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

  // Refresh weather every 5 min
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

  const handleReport = useCallback((type: "road_closed" | "danger" | "slowdown") => {
    setReports((prev) => [{
      id: `r${Date.now()}`,
      type,
      position: { lat: position.lat + (Math.random() - 0.5) * 0.001, lng: position.lng + (Math.random() - 0.5) * 0.001 },
      timestamp: new Date(),
      upvotes: 0,
    }, ...prev]);
  }, [position]);

  const handleClear = useCallback(() => {
    setOrigin(null); setDestination(null); setOriginText(""); setDestText("");
    setRouteActive(false); setRouteInfo(null); setDirections(null);
  }, []);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Full-screen map */}
      <MapPanel
        apiKey={API_KEY}
        userPosition={position}
        reports={reports}
        newsAlerts={newsAlerts}
        showRadar={showRadar}
        showTraffic={showTraffic}
        directions={directions}
        onDirectionsChange={handleDirectionsChange}
        routeOrigin={origin || position}
        routeDestination={destination}
        routeMode={mode}
        routeActive={routeActive}
      />

      {/* === TOP: Route + Weather + News === */}
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
        />
        <WeatherBar weather={weather} alert={weatherAlert} />
        <NewsAlerts onAlerts={setNewsAlerts} />
      </div>

      {/* === LEFT: 3 Report icons === */}
      <ReportIcons userPosition={position} onReport={handleReport} />

      {/* === BOTTOM-RIGHT: Map layer toggles === */}
      <div className="absolute bottom-20 md:bottom-6 right-3 z-20 flex flex-col gap-2">
        <button
          onClick={recenter}
          className="glass shadow-lg rounded-full w-11 h-11 flex items-center justify-center hover:bg-white transition"
        >
          <span className="material-symbols-outlined text-blue-600 text-[20px]">my_location</span>
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

      {/* === BOTTOM-LEFT: Chatbot icon === */}
      <button
        onClick={() => setChatOpen(true)}
        className="absolute bottom-20 md:bottom-6 left-3 z-20 w-13 h-13 md:w-14 md:h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700 transition active:scale-90"
        style={{ width: 52, height: 52 }}
      >
        <span className="material-symbols-outlined text-[24px]">smart_toy</span>
      </button>

      {/* === BRANDING === */}
      <div className="absolute top-3 left-3 z-10 glass rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
        <img src="/logo.svg" alt="R-Home" className="w-7 h-7" />
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-gray-800 leading-none">R-Home</div>
          <div className="text-[9px] text-gray-400">Roma</div>
        </div>
      </div>

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
