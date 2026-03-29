import { LatLng } from "./types";
import { getWeatherInfo } from "./weather";

// Grid of check points across Rome to build weather zones
const ROME_WEATHER_GRID: { name: string; pos: LatLng }[] = [
  { name: "Nord - Flaminio", pos: { lat: 41.920, lng: 12.475 } },
  { name: "Nord-Est - Tiburtina", pos: { lat: 41.915, lng: 12.530 } },
  { name: "Nord-Ovest - Prati", pos: { lat: 41.910, lng: 12.445 } },
  { name: "Centro - Termini", pos: { lat: 41.900, lng: 12.500 } },
  { name: "Centro-Ovest - Vaticano", pos: { lat: 41.903, lng: 12.455 } },
  { name: "Centro-Sud - Colosseo", pos: { lat: 41.890, lng: 12.492 } },
  { name: "Ovest - Trastevere", pos: { lat: 41.880, lng: 12.470 } },
  { name: "Est - San Lorenzo", pos: { lat: 41.895, lng: 12.520 } },
  { name: "Sud - Ostiense", pos: { lat: 41.870, lng: 12.480 } },
  { name: "Sud-Est - San Giovanni", pos: { lat: 41.885, lng: 12.510 } },
  { name: "Sud-Ovest - EUR", pos: { lat: 41.835, lng: 12.470 } },
  { name: "Est - Pigneto", pos: { lat: 41.890, lng: 12.530 } },
];

export interface WeatherZonePoint {
  name: string;
  position: LatLng;
  temperature: number;
  weatherCode: number;
  precipitation: number;
  rain: number;
  windSpeed: number;
  windGusts: number;
  label: string;
  icon: string;
  color: string;
  type: string;
}

function getZoneColor(code: number, precipitation: number): string {
  if (precipitation > 5) return "#7c3aed"; // violet - heavy
  if (precipitation > 2) return "#dc2626"; // red - moderate-heavy
  if (precipitation > 0.5) return "#f97316"; // orange - moderate
  if (precipitation > 0.1) return "#3b82f6"; // blue - light rain
  if (code >= 95) return "#7c3aed"; // thunderstorm
  if (code >= 71) return "#60a5fa"; // snow
  if (code >= 51) return "#3b82f6"; // drizzle/rain
  if (code >= 45) return "#9ca3af"; // fog
  if (code >= 2) return "#d1d5db"; // cloudy
  return "#22c55e"; // clear
}

export async function fetchWeatherZones(): Promise<WeatherZonePoint[]> {
  try {
    // Build multi-point request to Open-Meteo
    const lats = ROME_WEATHER_GRID.map((p) => p.pos.lat).join(",");
    const lngs = ROME_WEATHER_GRID.map((p) => p.pos.lng).join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code,precipitation,rain,wind_speed_10m,wind_gusts_10m&timezone=Europe/Rome`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    // Open-Meteo returns array when multiple coordinates
    const results: WeatherZonePoint[] = [];
    const items = Array.isArray(data) ? data : [data];

    items.forEach((item: any, i: number) => {
      const grid = ROME_WEATHER_GRID[i];
      if (!grid || !item.current) return;
      const c = item.current;
      const info = getWeatherInfo(c.weather_code);

      results.push({
        name: grid.name,
        position: grid.pos,
        temperature: c.temperature_2m,
        weatherCode: c.weather_code,
        precipitation: c.precipitation,
        rain: c.rain,
        windSpeed: c.wind_speed_10m,
        windGusts: c.wind_gusts_10m,
        label: info.label,
        icon: info.icon,
        color: getZoneColor(c.weather_code, c.precipitation),
        type: info.type,
      });
    });

    return results;
  } catch (e) {
    console.error("Weather zones error:", e);
    return [];
  }
}
