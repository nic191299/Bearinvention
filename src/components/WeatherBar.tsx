"use client";

import { useState } from "react";
import { WeatherData, WeatherAlert, getWeatherInfo } from "@/lib/weather";

interface WeatherBarProps {
  weather: WeatherData | null;
  alert: WeatherAlert | null;
  loading: boolean;
}

const SEVERITY_STYLES = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  danger: "bg-red-50 border-red-200 text-red-800",
};

const SEVERITY_ICON_BG = {
  info: "bg-blue-100 text-blue-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-600",
};

export default function WeatherBar({ weather, alert, loading }: WeatherBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-3 border border-gray-100 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-2 bg-gray-100 rounded w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.weatherCode);

  return (
    <div className="space-y-2">
      {/* Current weather compact */}
      <div
        className="bg-white rounded-2xl p-3 border border-gray-100 cursor-pointer hover:border-gray-200 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-600 text-[22px]">
              {info.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-800">
                {Math.round(weather.temperature)}°C
              </span>
              <span className="text-xs text-gray-500">{info.label}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span>Percepita {Math.round(weather.apparentTemperature)}°</span>
              <span>Vento {Math.round(weather.windSpeed)} km/h</span>
              <span>Umidita {weather.humidity}%</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-400 text-[16px]">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </div>

        {/* Expanded: mini precipitation forecast */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-up">
            <p className="text-[10px] font-medium text-gray-500 mb-2">Precipitazioni prossima ora</p>
            <div className="flex items-end gap-0.5 h-8">
              {weather.minutely.slice(0, 8).map((m, i) => {
                const height = Math.max(2, Math.min(32, m.precipitation * 16));
                const isRain = m.precipitation > 0.1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-sm transition-all ${isRain ? "bg-blue-400" : "bg-gray-200"}`}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-400">Ora</span>
              <span className="text-[9px] text-gray-400">+1h</span>
            </div>

            {/* Hourly forecast */}
            <p className="text-[10px] font-medium text-gray-500 mb-2 mt-3">Prossime ore</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weather.hourly.slice(0, 6).map((h, i) => {
                const hInfo = getWeatherInfo(h.weatherCode);
                const time = new Date(h.time);
                return (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[44px]">
                    <span className="text-[10px] text-gray-400">
                      {time.getHours().toString().padStart(2, "0")}:00
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-gray-600">
                      {hInfo.icon}
                    </span>
                    <span className="text-[11px] font-medium">{Math.round(h.temperature)}°</span>
                    {h.precipitation > 0 && (
                      <span className="text-[9px] text-blue-500">{h.precipitation}mm</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Weather alert */}
      {alert && (
        <div className={`rounded-2xl p-3 border ${SEVERITY_STYLES[alert.severity]} animate-fade-in-up`}>
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${SEVERITY_ICON_BG[alert.severity]}`}>
              <span className="material-symbols-outlined text-[20px]">{alert.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium opacity-90">
                <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                {alert.suggestion}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
