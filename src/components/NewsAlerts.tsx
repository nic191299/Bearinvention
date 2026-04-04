"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NewsAlert } from "@/lib/types";

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  strike: { icon: "front_hand", color: "#7c3aed", label: "Sciopero" },
  road_closure: { icon: "block", color: "#ef4444", label: "Chiusura" },
  event: { icon: "event", color: "#2563eb", label: "Evento" },
  transport: { icon: "directions_bus", color: "#f59e0b", label: "Trasporti" },
  crime: { icon: "local_police", color: "#dc2626", label: "Sicurezza" },
  general: { icon: "newspaper", color: "#6b7280", label: "Notizia" },
};

interface NewsAlertsProps {
  onAlerts?: (alerts: NewsAlert[]) => void;
  city?: string;
}

export default function NewsAlerts({ onAlerts, city = "Roma" }: NewsAlertsProps) {
  const [alerts, setAlerts] = useState<NewsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchNews = (cityName: string) => {
    return fetch(`/api/news?city=${encodeURIComponent(cityName)}`)
      .then((r) => r.json())
      .then((data) => data.alerts || []);
  };

  useEffect(() => {
    setLoading(true);
    fetchNews(city)
      .then((a) => { setAlerts(a); onAlerts?.(a); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetchNews(city).then((a) => { setAlerts(a); onAlerts?.(a); });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-2 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (alerts.length === 0) return null;

  const shown = expanded ? alerts : alerts.slice(0, 3);

  return (
    <div className="glass rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-live-pulse" />
          <span className="text-xs font-semibold text-gray-800">{city} Live</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{alerts.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/community?city=${encodeURIComponent(city)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-blue-600 font-semibold hover:underline"
          >
            Community →
          </Link>
          <span className="material-symbols-outlined text-gray-400 text-[16px]">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-1.5 max-h-[300px] overflow-y-auto custom-scroll">
        {shown.map((alert) => {
          const config = CATEGORY_CONFIG[alert.category];
          return (
            <a
              key={alert.id}
              href={alert.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 transition group"
            >
              <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ backgroundColor: config.color + "18" }}>
                <span className="material-symbols-outlined text-[14px]" style={{ color: config.color }}>{config.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-800 font-medium leading-snug line-clamp-2 group-hover:text-blue-600 transition">{alert.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: config.color + "18", color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-[9px] text-gray-400">{alert.source}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
