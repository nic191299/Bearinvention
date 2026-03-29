import { NextResponse } from "next/server";
import { NewsAlert } from "@/lib/types";

// Keywords to detect relevant news
const STRIKE_KEYWORDS = ["sciopero", "scioperi", "agitazione", "astensione"];
const ROAD_KEYWORDS = ["strada chiusa", "chiusura", "deviazione", "deviazioni", "lavori", "cantiere", "interdetta", "transennata"];
const EVENT_KEYWORDS = ["manifestazione", "corteo", "evento", "maratona", "processione", "partita", "concerto", "adunata"];
const TRANSPORT_KEYWORDS = ["atac", "metro", "metropolitana", "tram", "bus", "cotral", "trenitalia", "linea", "ritardo", "sospesa", "interrotta", "guasto"];

function categorize(text: string): NewsAlert["category"] {
  const lower = text.toLowerCase();
  if (STRIKE_KEYWORDS.some((k) => lower.includes(k))) return "strike";
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

    // Filter: only Rome-relevant transport/mobility news
    const lower = title.toLowerCase();
    const isRelevant =
      [...STRIKE_KEYWORDS, ...ROAD_KEYWORDS, ...EVENT_KEYWORDS, ...TRANSPORT_KEYWORDS].some((k) => lower.includes(k)) ||
      lower.includes("roma") || lower.includes("traffico") || lower.includes("mobilit");

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

const RSS_FEEDS = [
  {
    url: "https://news.google.com/rss/search?q=roma+sciopero+trasporti+OR+metro+OR+atac+OR+strada+chiusa+OR+traffico&hl=it&gl=IT&ceid=IT:it",
    source: "Google News",
  },
  {
    url: "https://www.romatoday.it/rss/trasporti/",
    source: "RomaToday",
  },
  {
    url: "https://www.romatoday.it/rss/cronaca/",
    source: "RomaToday",
  },
];

export async function GET() {
  try {
    const allAlerts: NewsAlert[] = [];

    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "UrbanMove/1.0" },
          next: { revalidate: 600 }, // Cache 10 min
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml, feed.source);
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allAlerts.push(...result.value);
      }
    }

    // Deduplicate by similar titles
    const seen = new Set<string>();
    const unique = allAlerts.filter((a) => {
      const key = a.title.substring(0, 50).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date, limit to 15
    unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ alerts: unique.slice(0, 15) });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ alerts: [] });
  }
}
