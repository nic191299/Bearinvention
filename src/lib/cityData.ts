export interface CityInfo {
  id?: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  newsTerms: string[]; // search terms for RSS news
}

export const CITIES: CityInfo[] = [
  { name: "Roma", country: "IT", lat: 41.9028, lng: 12.4964, newsTerms: ["Roma", "ATAC", "metro Roma"] },
  { name: "Milano", country: "IT", lat: 45.4654, lng: 9.1859, newsTerms: ["Milano", "ATM Milano", "metro Milano"] },
  { name: "Napoli", country: "IT", lat: 40.8518, lng: 14.2681, newsTerms: ["Napoli", "ANM Napoli", "metro Napoli"] },
  { name: "Torino", country: "IT", lat: 45.0703, lng: 7.6869, newsTerms: ["Torino", "GTT Torino"] },
  { name: "Palermo", country: "IT", lat: 38.1157, lng: 13.3615, newsTerms: ["Palermo", "AMAT Palermo"] },
  { name: "Genova", country: "IT", lat: 44.4056, lng: 8.9463, newsTerms: ["Genova", "AMT Genova"] },
  { name: "Bologna", country: "IT", lat: 44.4949, lng: 11.3426, newsTerms: ["Bologna", "TPER Bologna"] },
  { name: "Firenze", country: "IT", lat: 43.7696, lng: 11.2558, newsTerms: ["Firenze", "ATAF Firenze"] },
  { name: "Bari", country: "IT", lat: 41.1171, lng: 16.8719, newsTerms: ["Bari", "AMTAB Bari"] },
  { name: "Catania", country: "IT", lat: 37.5079, lng: 15.0830, newsTerms: ["Catania", "AMT Catania"] },
  { name: "Venezia", country: "IT", lat: 45.4408, lng: 12.3155, newsTerms: ["Venezia", "ACTV Venezia"] },
  { name: "Verona", country: "IT", lat: 45.4384, lng: 10.9916, newsTerms: ["Verona", "ATV Verona"] },
];

export const DEFAULT_CITY = CITIES[0]; // Roma

export function getCityBounds(city: CityInfo): { lat1: number; lng1: number; lat2: number; lng2: number } {
  const delta = 0.15;
  return {
    lat1: city.lat - delta,
    lng1: city.lng - delta,
    lat2: city.lat + delta,
    lng2: city.lng + delta,
  };
}

export function saveCityToStorage(city: CityInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bear_city", JSON.stringify(city));
}

export function loadCityFromStorage(): CityInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("bear_city");
    if (!raw) return null;
    return JSON.parse(raw) as CityInfo;
  } catch {
    return null;
  }
}
