import { Report } from "./types";

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60000);
}

export const initialReports: Report[] = [
  { id: "r1", type: "road_closed", position: { lat: 41.9009, lng: 12.5016 }, timestamp: minutesAgo(5), upvotes: 8 },
  { id: "r2", type: "slowdown", position: { lat: 41.8964, lng: 12.4825 }, timestamp: minutesAgo(12), upvotes: 14 },
  { id: "r3", type: "danger", position: { lat: 41.8902, lng: 12.4922 }, timestamp: minutesAgo(3), upvotes: 6 },
  { id: "r4", type: "road_closed", position: { lat: 41.8796, lng: 12.4701 }, timestamp: minutesAgo(20), upvotes: 11 },
  { id: "r5", type: "slowdown", position: { lat: 41.9128, lng: 12.4762 }, timestamp: minutesAgo(8), upvotes: 5 },
];
