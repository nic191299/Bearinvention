import { Report } from "./types";

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60000);
}

export const initialReports: Report[] = [
  // Mobilità
  { id: "r1", type: "road_closed", position: { lat: 41.9009, lng: 12.5016 }, timestamp: minutesAgo(5), upvotes: 8 },
  { id: "r2", type: "slowdown", position: { lat: 41.8964, lng: 12.4825 }, timestamp: minutesAgo(12), upvotes: 14 },
  { id: "r3", type: "danger", position: { lat: 41.8902, lng: 12.4922 }, timestamp: minutesAgo(3), upvotes: 6 },
  { id: "r4", type: "road_closed", position: { lat: 41.8796, lng: 12.4701 }, timestamp: minutesAgo(20), upvotes: 11 },
  { id: "r5", type: "slowdown", position: { lat: 41.9128, lng: 12.4762 }, timestamp: minutesAgo(8), upvotes: 5 },
  // Sicurezza
  { id: "s1", type: "dark_street", position: { lat: 41.8827, lng: 12.4707 }, timestamp: minutesAgo(15), upvotes: 12 },
  { id: "s2", type: "theft", position: { lat: 41.9010, lng: 12.5024 }, timestamp: minutesAgo(30), upvotes: 19 },
  { id: "s3", type: "harassment", position: { lat: 41.8986, lng: 12.4769 }, timestamp: minutesAgo(45), upvotes: 7 },
  { id: "s4", type: "dark_street", position: { lat: 41.8674, lng: 12.4711 }, timestamp: minutesAgo(60), upvotes: 15 },
  { id: "s5", type: "theft", position: { lat: 41.9100, lng: 12.4768 }, timestamp: minutesAgo(25), upvotes: 22 },
];
