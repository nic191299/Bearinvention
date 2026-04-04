import { Report } from "./types";
import { getExpiryMinutes } from "./geo";

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60000);
}

function expiresAt(type: string): Date {
  return new Date(Date.now() + getExpiryMinutes(type) * 60000);
}

// Only used as fallback when Supabase is not available
export const initialReports: Report[] = [
  { id: "r1", type: "road_closed", position: { lat: 41.9009, lng: 12.5016 }, timestamp: minutesAgo(5), confirms: 8, denials: 0, expiresAt: expiresAt("road_closed"), upvotes: 8 },
  { id: "r2", type: "slowdown", position: { lat: 41.8964, lng: 12.4825 }, timestamp: minutesAgo(12), confirms: 14, denials: 1, expiresAt: expiresAt("slowdown"), upvotes: 14 },
  { id: "r3", type: "danger", position: { lat: 41.8902, lng: 12.4922 }, timestamp: minutesAgo(3), confirms: 6, denials: 0, expiresAt: expiresAt("danger"), upvotes: 6 },
  { id: "s1", type: "dark_street", position: { lat: 41.8827, lng: 12.4707 }, timestamp: minutesAgo(15), confirms: 12, denials: 2, expiresAt: expiresAt("dark_street"), upvotes: 12 },
  { id: "s2", type: "theft", position: { lat: 41.9010, lng: 12.5024 }, timestamp: minutesAgo(30), confirms: 19, denials: 3, expiresAt: expiresAt("theft"), upvotes: 19 },
];
