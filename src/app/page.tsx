"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { LatLng, TransportReport, SafetyReport, RouteState } from "@/lib/types";
import { initialTransportReports, initialSafetyReports } from "@/lib/mockData";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, getWeatherAlert, WeatherData, WeatherAlert } from "@/lib/weather";
import Navbar from "@/components/Navbar";
import RoutePanel from "@/components/RoutePanel";
import ReportPanel from "@/components/ReportPanel";
import WeatherBar from "@/components/WeatherBar";
import ChatBot from "@/components/ChatBot";
import QuickReportFab from "@/components/QuickReportFab";

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const INITIAL_ROUTE: RouteState = {
  origin: null,
  destination: null,
  originText: "",
  destinationText: "",
  mode: "TRANSIT" as unknown as google.maps.TravelMode,
  active: false,
};

export default function Home() {
  const { position, recenter } = useGeolocation();
  const [transportReports, setTransportReports] = useState<TransportReport[]>(initialTransportReports);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(initialSafetyReports);
  const [chatOpen, setChatOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TransportReport | SafetyReport | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "panel">("map");
  const [route, setRoute] = useState<RouteState>(INITIAL_ROUTE);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<WeatherAlert | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch weather on position change (debounced)
  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);

    const timer = setTimeout(async () => {
      const data = await fetchWeather(position);
      if (cancelled) return;
      setWeather(data);
      setWeatherAlert(data ? getWeatherAlert(data) : null);
      setWeatherLoading(false);

      // Auto-show radar if it's raining
      if (data && data.precipitation > 0) {
        setShowRadar(true);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [position.lat, position.lng]);

  // Refresh weather every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchWeather(position);
      if (data) {
        setWeather(data);
        setWeatherAlert(getWeatherAlert(data));
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [position.lat, position.lng]);

  const handleRouteChange = useCallback((partial: Partial<RouteState>) => {
    setRoute((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleClearRoute = useCallback(() => {
    setRoute(INITIAL_ROUTE);
    setRouteInfo(null);
  }, []);

  const handleDirectionsResult = useCallback((_result: google.maps.DirectionsResult | null, info: { distance: string; duration: string } | null) => {
    setRouteInfo(info);
  }, []);

  const handleAddReport = useCallback((report: Omit<TransportReport, "id" | "timestamp" | "upvotes">) => {
    setTransportReports((prev) => [
      { ...report, id: `tr${Date.now()}`, timestamp: new Date(), upvotes: 0 },
      ...prev,
    ]);
  }, []);

  const handleUpvote = useCallback((id: string) => {
    setTransportReports((prev) => prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r)));
  }, []);

  const handleQuickReport = useCallback((report: { type: string; category: "transport" | "safety"; message: string; position: LatLng }) => {
    if (report.category === "transport") {
      setTransportReports((prev) => [
        {
          id: `tr${Date.now()}`,
          type: report.type as TransportReport["type"],
          position: report.position,
          message: report.message,
          author: "Utente anonimo",
          timestamp: new Date(),
          upvotes: 0,
        },
        ...prev,
      ]);
    } else {
      setSafetyReports((prev) => [
        {
          id: `sr${Date.now()}`,
          type: report.type as SafetyReport["type"],
          position: report.position,
          message: report.message,
          author: "Utente anonimo",
          timestamp: new Date(),
          upvotes: 0,
          confirmedSafe: 0,
          timeOfDay: new Date().getHours() >= 20 || new Date().getHours() < 6 ? "night" : "day",
        },
        ...prev,
      ]);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row md:pt-14 overflow-hidden">
        {/* Sidebar */}
        <div className={`${mobileView === "panel" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[400px] lg:w-[420px] h-full bg-gray-50 border-r border-gray-200 overflow-hidden z-10`}>
          <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 pb-24 md:pb-4">
            {/* Weather */}
            <WeatherBar weather={weather} alert={weatherAlert} loading={weatherLoading} />

            {/* Route planner */}
            <RoutePanel
              route={route}
              onRouteChange={handleRouteChange}
              userPosition={position}
              routeInfo={routeInfo}
              onClear={handleClearRoute}
              apiLoaded={!!API_KEY}
            />

            {/* Map layer toggles */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={`chip flex-1 justify-center ${showTraffic ? "bg-orange-100 text-orange-700 ring-1 ring-orange-300" : "bg-white text-gray-600 border border-gray-200"}`}
              >
                <span className="material-symbols-outlined text-[14px]">traffic</span>
                Traffico
              </button>
              <button
                onClick={() => setShowRadar(!showRadar)}
                className={`chip flex-1 justify-center ${showRadar ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "bg-white text-gray-600 border border-gray-200"}`}
              >
                <span className="material-symbols-outlined text-[14px]">rainy</span>
                Radar
              </button>
              <button
                onClick={() => setShowSafety(!showSafety)}
                className={`chip flex-1 justify-center ${showSafety ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-white text-gray-600 border border-gray-200"}`}
              >
                <span className="material-symbols-outlined text-[14px]">shield</span>
                Sicurezza
              </button>
            </div>

            {/* Reports */}
            <ReportPanel
              reports={transportReports}
              onAddReport={handleAddReport}
              onUpvote={handleUpvote}
              userPosition={position}
            />
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 relative ${mobileView === "panel" ? "hidden md:block" : ""}`}>
          <MapPanel
            apiKey={API_KEY}
            userPosition={position}
            transportReports={transportReports}
            safetyReports={safetyReports}
            route={route}
            onMapClick={() => {}}
            onDirectionsResult={handleDirectionsResult}
            showTraffic={showTraffic}
            showSafetyLayer={showSafety}
            showRadar={showRadar}
            selectedReport={selectedReport}
            onSelectReport={setSelectedReport}
          />

          {/* Map overlay: weather alert banner */}
          {weatherAlert && weatherAlert.severity !== "info" && (
            <div className="absolute top-4 left-4 right-16 z-10 animate-fade-in-up">
              <div className={`rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 ${
                weatherAlert.severity === "danger"
                  ? "bg-red-500 text-white"
                  : "bg-amber-400 text-amber-900"
              }`}>
                <span className="material-symbols-outlined text-[22px]">{weatherAlert.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{weatherAlert.title}</p>
                  <p className="text-xs opacity-90">{weatherAlert.suggestion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Map controls - top right */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={recenter}
              className="glass shadow-lg rounded-full w-11 h-11 flex items-center justify-center hover:bg-white transition"
            >
              <span className="material-symbols-outlined text-blue-600 text-[20px]">my_location</span>
            </button>
          </div>

          {/* Chatbot icon only - bottom left */}
          <button
            onClick={() => setChatOpen(true)}
            className="absolute bottom-24 md:bottom-6 left-4 z-20 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700 transition active:scale-90"
          >
            <span className="material-symbols-outlined text-[26px]">smart_toy</span>
          </button>

          {/* Waze-style report FAB - bottom right */}
          <QuickReportFab userPosition={position} onReport={handleQuickReport} />
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200 flex">
          <button
            onClick={() => setMobileView("map")}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium ${mobileView === "map" ? "text-blue-600" : "text-gray-400"}`}
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            Mappa
          </button>
          <button
            onClick={() => setMobileView("panel")}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium ${mobileView === "panel" ? "text-blue-600" : "text-gray-400"}`}
          >
            <span className="material-symbols-outlined text-[20px]">feed</span>
            Segnalazioni
          </button>
          <Link
            href="/safety"
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium text-gray-400"
          >
            <span className="material-symbols-outlined text-[20px]">shield</span>
            Sicurezza
          </Link>
        </div>
      </div>

      <ChatBot
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userPosition={position}
        transportReports={transportReports}
        safetyReports={safetyReports}
        weather={weather}
      />
    </div>
  );
}
