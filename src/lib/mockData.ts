import { BusStop, CommunityReport } from "./types";

// Real Rome bus stops
export const busStops: BusStop[] = [
  { id: "s1", name: "Termini", lat: 41.9009, lng: 12.5016, lines: ["40", "64", "170", "H"] },
  { id: "s2", name: "Colosseo", lat: 41.8902, lng: 12.4922, lines: ["75", "81", "673"] },
  { id: "s3", name: "Piazza Venezia", lat: 41.8964, lng: 12.4825, lines: ["40", "64", "70", "87"] },
  { id: "s4", name: "Trastevere", lat: 41.8796, lng: 12.4701, lines: ["H", "780", "115"] },
  { id: "s5", name: "Piazzale Flaminio", lat: 41.9128, lng: 12.4762, lines: ["2", "61", "160", "490"] },
  { id: "s6", name: "San Giovanni", lat: 41.8859, lng: 12.5064, lines: ["16", "81", "85", "87"] },
  { id: "s7", name: "Ottaviano", lat: 41.9073, lng: 12.4487, lines: ["23", "34", "49", "492"] },
  { id: "s8", name: "EUR Fermi", lat: 41.8299, lng: 12.4677, lines: ["30", "170", "714"] },
  { id: "s9", name: "Piazza Barberini", lat: 41.9038, lng: 12.4886, lines: ["52", "53", "61", "62"] },
  { id: "s10", name: "Largo Argentina", lat: 41.8955, lng: 12.4767, lines: ["40", "46", "62", "64"] },
  { id: "s11", name: "Piazza del Popolo", lat: 41.9107, lng: 12.4765, lines: ["61", "120", "160", "490"] },
  { id: "s12", name: "Tiburtina", lat: 41.9104, lng: 12.5300, lines: ["71", "111", "163", "211"] },
];

// Bike sharing stations (realistic Rome locations)
export const bikeStations = [
  { name: "Bike - Termini Est", lat: 41.9015, lng: 12.5040, bikes: 8 },
  { name: "Bike - Colosseo", lat: 41.8910, lng: 12.4935, bikes: 3 },
  { name: "Bike - Piazza Venezia", lat: 41.8970, lng: 12.4810, bikes: 5 },
  { name: "Bike - Trastevere", lat: 41.8800, lng: 12.4690, bikes: 6 },
  { name: "Bike - Flaminio", lat: 41.9120, lng: 12.4770, bikes: 4 },
  { name: "Bike - San Giovanni", lat: 41.8865, lng: 12.5050, bikes: 7 },
];

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60000);
}

export const initialReports: CommunityReport[] = [
  {
    id: "r1",
    type: "delay",
    stopId: "s1",
    lat: 41.9009,
    lng: 12.5016,
    message: "Linea 64 in ritardo di 20+ minuti. Nessun avviso ATAC.",
    author: "Marco R.",
    timestamp: minutesAgo(3),
    upvotes: 12,
  },
  {
    id: "r2",
    type: "cancelled",
    stopId: "s3",
    lat: 41.8964,
    lng: 12.4825,
    message: "Il 40 non passa da mezz'ora. Confermato da altri alla fermata.",
    author: "Giulia P.",
    timestamp: minutesAgo(8),
    upvotes: 8,
  },
  {
    id: "r3",
    type: "crowded",
    stopId: "s2",
    lat: 41.8902,
    lng: 12.4922,
    message: "Bus 75 strapieno, impossibile salire. Meglio camminare verso la metro.",
    author: "Luca M.",
    timestamp: minutesAgo(5),
    upvotes: 15,
  },
  {
    id: "r4",
    type: "alternative",
    stopId: "s4",
    lat: 41.8796,
    lng: 12.4701,
    message: "Da qui a Termini a piedi in 25 min passando per Lungotevere. Percorso piacevole!",
    author: "Sara T.",
    timestamp: minutesAgo(12),
    upvotes: 6,
  },
  {
    id: "r5",
    type: "info",
    stopId: "s6",
    lat: 41.8859,
    lng: 12.5064,
    message: "Metro A funzionante regolarmente. Buona alternativa ai bus zona San Giovanni.",
    author: "Andrea B.",
    timestamp: minutesAgo(2),
    upvotes: 9,
  },
  {
    id: "r6",
    type: "delay",
    stopId: "s5",
    lat: 41.9128,
    lng: 12.4762,
    message: "Tram 2 fermo per guasto tecnico a Flaminio. Usare bus 490 come alternativa.",
    author: "Chiara L.",
    timestamp: minutesAgo(15),
    upvotes: 11,
  },
  {
    id: "r7",
    type: "alternative",
    lat: 41.9050,
    lng: 12.4950,
    message: "Monopattini Lime disponibili vicino Via Nazionale. Buona opzione per evitare i bus.",
    author: "Federico N.",
    timestamp: minutesAgo(7),
    upvotes: 4,
  },
];

export const reportTypeConfig = {
  delay: { label: "Ritardo", color: "#f59e0b", emoji: "⏱️" },
  cancelled: { label: "Cancellato", color: "#ef4444", emoji: "🚫" },
  crowded: { label: "Affollato", color: "#f97316", emoji: "👥" },
  info: { label: "Info", color: "#3b82f6", emoji: "ℹ️" },
  alternative: { label: "Alternativa", color: "#10b981", emoji: "✅" },
};
