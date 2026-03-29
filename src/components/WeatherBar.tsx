"use client";

import { WeatherData, WeatherAlert, getWeatherInfo } from "@/lib/weather";

interface WeatherBarProps {
  weather: WeatherData | null;
  alert: WeatherAlert | null;
}

export default function WeatherBar({ weather, alert }: WeatherBarProps) {
  if (!weather) return null;
  const info = getWeatherInfo(weather.weatherCode);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Compact current weather */}
      <div className="glass rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-blue-600 text-[20px]">{info.icon}</span>
        <span className="text-sm font-bold text-gray-800">{Math.round(weather.temperature)}°</span>
        <span className="text-[11px] text-gray-500 truncate">{info.label}</span>
        {weather.precipitation > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold ml-auto">
            {weather.precipitation}mm
          </span>
        )}
      </div>

      {/* Alert banner */}
      {alert && (
        <div className={`rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg text-sm ${
          alert.severity === "danger" ? "bg-red-500 text-white" :
          alert.severity === "warning" ? "bg-amber-400 text-amber-900" :
          "bg-blue-100 text-blue-800"
        }`}>
          <span className="material-symbols-outlined text-[18px]">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold">{alert.title}</span>
            <span className="text-[10px] opacity-80 ml-1">{alert.suggestion}</span>
          </div>
        </div>
      )}
    </div>
  );
}
