"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { BusStop, CommunityReport } from "@/lib/types";
import { reportTypeConfig, bikeStations } from "@/lib/mockData";

// Fix default marker icons
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "report-marker",
});

const busStopIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;background:#1e40af;border:2px solid white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚌</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "report-marker",
});

const bikeIcon = L.divIcon({
  html: `<div style="width:24px;height:24px;background:#059669;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚲</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: "report-marker",
});

function makeReportIcon(type: CommunityReport["type"]) {
  const config = reportTypeConfig[type];
  return L.divIcon({
    html: `<div style="width:30px;height:30px;background:${config.color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${config.emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: "report-marker",
  });
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

interface MapViewProps {
  busStops: BusStop[];
  reports: CommunityReport[];
  userPosition: { lat: number; lng: number };
  selectedStop: BusStop | null;
  onSelectStop: (stop: BusStop) => void;
  walkingRoute: [number, number][] | null;
  showBikes: boolean;
  flyTo: { lat: number; lng: number } | null;
}

export default function MapView({
  busStops,
  reports,
  userPosition,
  selectedStop,
  onSelectStop,
  walkingRoute,
  showBikes,
  flyTo,
}: MapViewProps) {
  return (
    <MapContainer
      center={[userPosition.lat, userPosition.lng]}
      zoom={14}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {flyTo && <FlyToLocation lat={flyTo.lat} lng={flyTo.lng} />}

      {/* User position */}
      <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
        <Popup>
          <strong>La tua posizione</strong>
        </Popup>
      </Marker>
      <Circle
        center={[userPosition.lat, userPosition.lng]}
        radius={100}
        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.1, weight: 1 }}
      />

      {/* Bus stops */}
      {busStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={busStopIcon}
          eventHandlers={{ click: () => onSelectStop(stop) }}
        >
          <Popup>
            <div>
              <strong>{stop.name}</strong>
              <br />
              Linee: {stop.lines.join(", ")}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Community reports */}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat, report.lng]}
          icon={makeReportIcon(report.type)}
        >
          <Popup>
            <div style={{ maxWidth: 200 }}>
              <strong>{reportTypeConfig[report.type].emoji} {reportTypeConfig[report.type].label}</strong>
              <p style={{ margin: "4px 0", fontSize: 13 }}>{report.message}</p>
              <small style={{ color: "#64748b" }}>
                {report.author} · {Math.round((Date.now() - report.timestamp.getTime()) / 60000)} min fa
                · 👍 {report.upvotes}
              </small>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Bike stations */}
      {showBikes &&
        bikeStations.map((station, i) => (
          <Marker key={`bike-${i}`} position={[station.lat, station.lng]} icon={bikeIcon}>
            <Popup>
              <strong>{station.name}</strong>
              <br />
              {station.bikes} bici disponibili
            </Popup>
          </Marker>
        ))}

      {/* Walking route */}
      {walkingRoute && (
        <Polyline
          positions={walkingRoute}
          pathOptions={{ color: "#2563eb", weight: 4, dashArray: "10, 6" }}
        />
      )}

      {/* Selected stop highlight */}
      {selectedStop && (
        <Circle
          center={[selectedStop.lat, selectedStop.lng]}
          radius={150}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15, weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
