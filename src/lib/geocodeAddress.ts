import { LatLng } from "./types";

// Italian location patterns in news titles
const LOCATION_PATTERNS = [
  /\b(via\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,30}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /\b(piazza\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,30}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /\b(corso\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,25}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /\b(viale\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,25}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /\b(largo\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,25}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /\b(lungarno\s+[A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,25}?)(?:\s+[,\n]|\s+a\s|\s+di\s|$)/i,
  /(?:zona|quartiere|rione)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\s]{3,20}?)(?:\s+[,\n]|\s+a\s|$)/i,
];

export function extractLocationFromTitle(title: string): string | null {
  for (const pattern of LOCATION_PATTERNS) {
    const match = title.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }
  return null;
}

const geocodeCache = new Map<string, LatLng | null>();

export async function geocodeLocation(
  location: string,
  city: string,
  apiKey: string
): Promise<LatLng | null> {
  const query = `${location}, ${city}, Italia`;
  if (geocodeCache.has(query)) return geocodeCache.get(query)!;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=it&region=it`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
    if (!res.ok) { geocodeCache.set(query, null); return null; }
    const data = await res.json();
    if (data.status === "OK" && data.results[0]) {
      const loc = data.results[0].geometry.location;
      const pos: LatLng = { lat: loc.lat, lng: loc.lng };
      geocodeCache.set(query, pos);
      return pos;
    }
  } catch { /* skip */ }

  geocodeCache.set(query, null);
  return null;
}
