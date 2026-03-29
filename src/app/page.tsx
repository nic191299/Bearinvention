"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { BusStop, CommunityReport } from "@/lib/types";
import { busStops, initialReports } from "@/lib/mockData";
import Sidebar from "@/components/Sidebar";
import ChatBot from "@/components/ChatBot";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// Default: near Termini station
const DEFAULT_POSITION = { lat: 41.9009, lng: 12.5016 };

export default function Home() {
  const [userPosition, setUserPosition] = useState(DEFAULT_POSITION);
  const [reports, setReports] = useState<CommunityReport[]>(initialReports);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [showBikes, setShowBikes] = useState(false);
  const [walkingRoute, setWalkingRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileShowMap, setMobileShowMap] = useState(true);

  const handleSelectStop = useCallback((stop: BusStop) => {
    setSelectedStop(stop);
    setFlyTo({ lat: stop.lat, lng: stop.lng });
    setWalkingRoute(null);
    setRouteInfo(null);
  }, []);

  const handleAddReport = useCallback(
    (report: Omit<CommunityReport, "id" | "timestamp" | "upvotes">) => {
      const newReport: CommunityReport = {
        ...report,
        id: `r${Date.now()}`,
        timestamp: new Date(),
        upvotes: 0,
      };
      setReports((prev) => [newReport, ...prev]);
    },
    []
  );

  const handleUpvote = useCallback((id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
  }, []);

  const handleFindRoute = useCallback(async () => {
    if (!selectedStop) return;

    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${userPosition.lng},${userPosition.lat};${selectedStop.lng},${selectedStop.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
        setWalkingRoute(coords);

        const distKm = (route.distance / 1000).toFixed(1);
        const durMin = Math.round(route.duration / 60);
        setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min` });
      }
    } catch (err) {
      console.error("Routing error:", err);
    }
  }, [selectedStop, userPosition]);

  // Try to get real GPS
  const handleLocateMe = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPosition(newPos);
          setFlyTo(newPos);
        },
        () => {
          // Keep default position on error
        }
      );
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-gray-100">
      {/* Mobile toggle */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setMobileShowMap(true)}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            mobileShowMap ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          🗺️ Mappa
        </button>
        <button
          onClick={() => setMobileShowMap(false)}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            !mobileShowMap ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          📋 Community
        </button>
      </div>

      {/* Sidebar - hidden on mobile when map is shown */}
      <div className={`${mobileShowMap ? "hidden lg:flex" : "flex"} flex-col h-full`}>
        <Sidebar
          reports={reports}
          selectedStop={selectedStop}
          onAddReport={handleAddReport}
          onUpvote={handleUpvote}
          onOpenChat={() => setChatOpen(true)}
          onToggleBikes={() => setShowBikes(!showBikes)}
          showBikes={showBikes}
          onFindRoute={handleFindRoute}
          walkingRoute={walkingRoute}
          routeInfo={routeInfo}
          userPosition={userPosition}
        />
      </div>

      {/* Map */}
      <div className={`flex-1 relative ${!mobileShowMap ? "hidden lg:block" : ""}`}>
        <MapView
          busStops={busStops}
          reports={reports}
          userPosition={userPosition}
          selectedStop={selectedStop}
          onSelectStop={handleSelectStop}
          walkingRoute={walkingRoute}
          showBikes={showBikes}
          flyTo={flyTo}
        />

        {/* Map overlay buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
          <button
            onClick={handleLocateMe}
            className="bg-white shadow-lg rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            title="Trova la mia posizione"
          >
            📍 Localizzami
          </button>
        </div>

        {/* Floating SOS button on mobile */}
        <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={() => setChatOpen(true)}
            className="bg-blue-600 text-white shadow-xl rounded-full px-6 py-3 text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            🤖 Sono bloccato, aiutami!
          </button>
        </div>
      </div>

      {/* Chat overlay */}
      <ChatBot
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userPosition={userPosition}
        nearbyReports={reports}
      />
    </div>
  );
}
