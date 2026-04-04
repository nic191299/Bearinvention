import { NextRequest, NextResponse } from "next/server";
import { NewsAlert } from "@/lib/types";
import { extractLocationFromTitle, geocodeLocation } from "@/lib/geocodeAddress";

const STRIKE_KEYWORDS = ["sciopero", "scioperi", "agitazione", "astensione"];
const ROAD_KEYWORDS = ["strada chiusa", "chiusura", "deviazione", "deviazioni", "lavori", "cantiere", "interdetta", "transennata"];
const EVENT_KEYWORDS = ["manifestazione", "corteo", "evento", "maratona", "processione", "partita", "concerto", "adunata"];
const TRANSPORT_KEYWORDS = ["metro", "metropolitana", "tram", "bus", "cotral", "trenitalia", "linea", "ritardo", "sospesa", "interrotta", "guasto", "atac", "atm", "anm", "gtt", "actv"];
const CRIME_KEYWORDS = ["furto", "furti", "rapina", "rapine", "scippo", "borseggio", "aggressione", "accoltellamento", "rissa", "molestie", "violenza", "spaccio", "arresto", "arrestat", "derubat"];

function categorize(text: string): NewsAlert["category"] {
  const lower = text.toLowerCase();
  if (STRIKE_KEYWORDS.some((k) => lower.includes(k))) return "strike";
  if (CRIME_KEYWORDS.some((k) => lower.includes(k))) return "crime";
  if (ROAD_KEYWORDS.some((k) => lower.includes(k))) return "road_closure";
  if (EVENT_KEYWORDS.some((k) => lower.includes(k))) return "event";
  if (TRANSPORT_KEYWORDS.some((k) => lower.includes(k))) return "transport";
  return "general";
}

function parseRssItems(xml: string, source: string): NewsAlert[] {
  const items: NewsAlert[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || "";
    const link = content.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const lower = title.toLowerCase();
    const isRelevant =
      [...STRIKE_KEYWORDS, ...ROAD_KEYWORDS, ...EVENT_KEYWORDS, ...TRANSPORT_KEYWORDS, ...CRIME_KEYWORDS].some((k) => lower.includes(k)) ||
      lower.includes("traffico") || lower.includes("mobilit") || lower.includes("sicurezza");
    if (title && isRelevant) {
      items.push({
        id: `news-${items.length}-${Date.now()}`,
        title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        source,
        url: link,
        date: pubDate,
        category: categorize(title),
      });
    }
  }
  return items;
}

function getRssFeeds(city: string) {
  const q = encodeURIComponent(city);
  return [
    {
      url: `https://news.google.com/rss/search?q=${q}+sciopero+trasporti+OR+metro+OR+strada+chiusa+OR+traffico&hl=it&gl=IT&ceid=IT:it`,
      source: "Google News",
    },
    {
      url: `https://news.google.com/rss/search?q=${q}+furto+OR+rapina+OR+aggressione+OR+scippo+OR+sicurezza&hl=it&gl=IT&ceid=IT:it`,
      source: "Google News",
    },
  ];
}

const CITY_FEEDS: Record<string, { url: string; source: string }[]> = {
  roma: [
    { url: "https://www.romatoday.it/rss/trasporti/", source: "RomaToday" },
    { url: "https://www.romatoday.it/rss/cronaca/", source: "RomaToday" },
  ],
  milano: [
    { url: "https://www.milanotoday.it/rss/trasporti/", source: "MilanoToday" },
    { url: "https://www.milanotoday.it/rss/cronaca/", source: "MilanoToday" },
  ],
  napoli: [
    { url: "https://www.napolitoday.it/rss/trasporti/", source: "NapoliToday" },
    { url: "https://www.napolitoday.it/rss/cronaca/", source: "NapoliToday" },
  ],
  torino: [
    { url: "https://www.torinotoday.it/rss/trasporti/", source: "TorinoToday" },
    { url: "https://www.torinotoday.it/rss/cronaca/", source: "TorinoToday" },
  ],
  firenze: [
    { url: "https://www.firenzetoday.it/rss/trasporti/", source: "FirenzeToday" },
    { url: "https://www.firenzetoday.it/rss/cronaca/", source: "FirenzeToday" },
  ],
  bologna: [
    { url: "https://www.bolognatoday.it/rss/trasporti/", source: "BolognaToday" },
    { url: "https://www.bolognatoday.it/rss/cronaca/", source: "BolognaToday" },
  ],
};

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") || "Roma";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const cityKey = city.toLowerCase().replace(/\s+/g, "");
  const feeds = [
    ...getRssFeeds(city),
    ...(CITY_FEEDS[cityKey] || []),
  ];

  try {
    const allAlerts: NewsAlert[] = [];
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Salvo/1.0" },
          next: { revalidate: 600 },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml, feed.source);
      })
    );
    for (const result of results) {
      if (result.status === "fulfilled") allAlerts.push(...result.value);
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = allAlerts.filter((a) => {
      const key = a.title.substring(0, 50).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const top = unique.slice(0, 20);

    // Geocode items that have detectable locations (parallel, skip if no API key)
    if (apiKey) {
      await Promise.allSettled(
        top
          .filter((a) => a.category !== "general" && a.category !== "transport")
          .map(async (alert) => {
            const loc = extractLocationFromTitle(alert.title);
            if (loc) {
              const pos = await geocodeLocation(loc, city, apiKey);
              if (pos) alert.position = pos;
            }
          })
      );
    }

    return NextResponse.json({ alerts: top });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ alerts: [] });
  }
}
