import { LatLng } from "./types";

// --- Open-Meteo: hyper-local forecast (free, no key) ---

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number;
  rain: number;
  snowfall: number;
  cloudCover: number;
  // Minutely precipitation (next hour)
  minutely: { time: string; precipitation: number }[];
  // Hourly (next 6h)
  hourly: { time: string; precipitation: number; weatherCode: number; temperature: number }[];
}

export interface WeatherAlert {
  type: "rain" | "heavy_rain" | "thunderstorm" | "hail" | "snow" | "wind" | "clear";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  icon: string;
  suggestion: string;
}

// WMO Weather codes mapping
const WMO_CODES: Record<number, { label: string; icon: string; type: WeatherAlert["type"] }> = {
  0: { label: "Sereno", icon: "clear_day", type: "clear" },
  1: { label: "Prevalentemente sereno", icon: "partly_cloudy_day", type: "clear" },
  2: { label: "Parzialmente nuvoloso", icon: "cloud", type: "clear" },
  3: { label: "Coperto", icon: "cloud", type: "clear" },
  45: { label: "Nebbia", icon: "foggy", type: "clear" },
  48: { label: "Nebbia con brina", icon: "foggy", type: "clear" },
  51: { label: "Pioviggine leggera", icon: "rainy", type: "rain" },
  53: { label: "Pioviggine moderata", icon: "rainy", type: "rain" },
  55: { label: "Pioviggine intensa", icon: "rainy", type: "rain" },
  56: { label: "Pioggia gelata leggera", icon: "weather_mix", type: "rain" },
  57: { label: "Pioggia gelata intensa", icon: "weather_mix", type: "heavy_rain" },
  61: { label: "Pioggia leggera", icon: "rainy", type: "rain" },
  63: { label: "Pioggia moderata", icon: "rainy", type: "rain" },
  65: { label: "Pioggia forte", icon: "rainy", type: "heavy_rain" },
  66: { label: "Pioggia gelata leggera", icon: "weather_mix", type: "rain" },
  67: { label: "Pioggia gelata forte", icon: "weather_mix", type: "heavy_rain" },
  71: { label: "Neve leggera", icon: "weather_snowy", type: "snow" },
  73: { label: "Neve moderata", icon: "weather_snowy", type: "snow" },
  75: { label: "Neve forte", icon: "weather_snowy", type: "snow" },
  77: { label: "Granelli di neve", icon: "weather_snowy", type: "snow" },
  80: { label: "Rovesci leggeri", icon: "rainy", type: "rain" },
  81: { label: "Rovesci moderati", icon: "rainy", type: "rain" },
  82: { label: "Rovesci violenti", icon: "rainy", type: "heavy_rain" },
  85: { label: "Rovesci di neve leggeri", icon: "weather_snowy", type: "snow" },
  86: { label: "Rovesci di neve forti", icon: "weather_snowy", type: "snow" },
  95: { label: "Temporale", icon: "thunderstorm", type: "thunderstorm" },
  96: { label: "Temporale con grandine leggera", icon: "thunderstorm", type: "hail" },
  99: { label: "Temporale con grandine forte", icon: "thunderstorm", type: "hail" },
};

export function getWeatherInfo(code: number) {
  return WMO_CODES[code] || WMO_CODES[0];
}

export async function fetchWeather(pos: LatLng): Promise<WeatherData | null> {
  try {
    // Fetch current + minutely (15-min) + hourly
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,is_day,precipitation,rain,snowfall,cloud_cover&minutely_15=precipitation&hourly=precipitation,weather_code,temperature_2m&forecast_hours=6&timezone=Europe/Rome`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const current = data.current;
    const minutely15 = data.minutely_15;
    const hourly = data.hourly;

    return {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windGusts: current.wind_gusts_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      rain: current.rain,
      snowfall: current.snowfall,
      cloudCover: current.cloud_cover,
      minutely: (minutely15?.time || []).map((t: string, i: number) => ({
        time: t,
        precipitation: minutely15.precipitation[i],
      })),
      hourly: (hourly?.time || []).map((t: string, i: number) => ({
        time: t,
        precipitation: hourly.precipitation[i],
        weatherCode: hourly.weather_code[i],
        temperature: hourly.temperature_2m[i],
      })),
    };
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

export function getWeatherAlert(weather: WeatherData): WeatherAlert | null {
  const info = getWeatherInfo(weather.weatherCode);

  if (info.type === "hail") {
    return {
      type: "hail",
      severity: "danger",
      title: "Grandine in corso!",
      message: `${info.label}. Precipitazioni: ${weather.precipitation}mm. Cerca riparo immediatamente.`,
      icon: "thunderstorm",
      suggestion: "Prendi la metro o cerca un riparo. Non restare all'aperto.",
    };
  }

  if (info.type === "thunderstorm") {
    return {
      type: "thunderstorm",
      severity: "danger",
      title: "Temporale in corso!",
      message: `${info.label}. Vento a ${weather.windGusts} km/h. Non camminare all'aperto.`,
      icon: "thunderstorm",
      suggestion: "Usa la metro o aspetta al riparo. Evita alberi e zone aperte.",
    };
  }

  if (info.type === "heavy_rain") {
    return {
      type: "heavy_rain",
      severity: "warning",
      title: "Pioggia forte",
      message: `${info.label}. ${weather.precipitation}mm di pioggia. Senza ombrello ti bagni subito.`,
      icon: "rainy",
      suggestion: "Prendi la metro o un bus. Se devi camminare, cerca percorsi coperti.",
    };
  }

  if (info.type === "rain") {
    return {
      type: "rain",
      severity: "info",
      title: "Pioggia leggera",
      message: `${info.label}. ${weather.precipitation}mm. Ombrello consigliato.`,
      icon: "rainy",
      suggestion: "Se non hai l'ombrello, valuta la metro come alternativa.",
    };
  }

  if (info.type === "snow") {
    return {
      type: "snow",
      severity: "warning",
      title: "Neve!",
      message: `${info.label}. Attenzione alle strade scivolose.`,
      icon: "weather_snowy",
      suggestion: "Usa i mezzi pubblici. Attenzione al ghiaccio sui marciapiedi.",
    };
  }

  if (weather.windGusts > 60) {
    return {
      type: "wind",
      severity: "warning",
      title: "Vento forte",
      message: `Raffiche fino a ${weather.windGusts} km/h. Attenzione in bici o monopattino.`,
      icon: "air",
      suggestion: "Evita bici e monopattini. Meglio mezzi pubblici o a piedi su strade riparate.",
    };
  }

  // Check if rain is coming in the next hour
  const upcomingRain = weather.minutely.find((m) => m.precipitation > 0.5);
  if (upcomingRain) {
    const minutesUntilRain = Math.max(0, Math.round((new Date(upcomingRain.time).getTime() - Date.now()) / 60000));
    if (minutesUntilRain > 0 && minutesUntilRain < 60) {
      return {
        type: "rain",
        severity: "info",
        title: `Pioggia tra ${minutesUntilRain} minuti`,
        message: `Previsti ${upcomingRain.precipitation}mm. Preparati o scegli un percorso coperto.`,
        icon: "rainy",
        suggestion: minutesUntilRain < 15
          ? "Hai poco tempo: prendi la metro o entra in un negozio."
          : "Hai tempo per arrivare a destinazione, ma porta l'ombrello.",
      };
    }
  }

  return null;
}

// --- RainViewer: radar tile URLs (free, no key) ---

export interface RadarFrame {
  path: string;
  time: number;
}

export async function fetchRadarFrames(): Promise<{ past: RadarFrame[]; nowcast: RadarFrame[] } | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) return null;
    const data = await res.json();
    return {
      past: data.radar?.past || [],
      nowcast: data.radar?.nowcast || [],
    };
  } catch {
    return null;
  }
}

export function getRadarTileUrl(frame: RadarFrame, size: number = 256): string {
  // Returns a tile URL template for Google Maps overlay
  // {z}/{x}/{y} will be replaced by the map
  return `https://tilecache.rainviewer.com${frame.path}/${size}/{z}/{x}/{y}/4/1_1.png`;
}
