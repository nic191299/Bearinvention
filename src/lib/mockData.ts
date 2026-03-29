import { TransportReport, SafetyReport, BusStop } from "./types";

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60000);
}

export const busStops: BusStop[] = [
  { id: "s1", name: "Termini", position: { lat: 41.9009, lng: 12.5016 }, lines: ["40", "64", "170", "H"] },
  { id: "s2", name: "Colosseo", position: { lat: 41.8902, lng: 12.4922 }, lines: ["75", "81", "673"] },
  { id: "s3", name: "Piazza Venezia", position: { lat: 41.8964, lng: 12.4825 }, lines: ["40", "64", "70", "87"] },
  { id: "s4", name: "Trastevere", position: { lat: 41.8796, lng: 12.4701 }, lines: ["H", "780", "115"] },
  { id: "s5", name: "Piazzale Flaminio", position: { lat: 41.9128, lng: 12.4762 }, lines: ["2", "61", "160", "490"] },
  { id: "s6", name: "San Giovanni", position: { lat: 41.8859, lng: 12.5064 }, lines: ["16", "81", "85", "87"] },
  { id: "s7", name: "Ottaviano", position: { lat: 41.9073, lng: 12.4487 }, lines: ["23", "34", "49", "492"] },
  { id: "s8", name: "Piazza Barberini", position: { lat: 41.9038, lng: 12.4886 }, lines: ["52", "53", "61", "62"] },
  { id: "s9", name: "Largo Argentina", position: { lat: 41.8955, lng: 12.4767 }, lines: ["40", "46", "62", "64"] },
  { id: "s10", name: "Tiburtina", position: { lat: 41.9104, lng: 12.5300 }, lines: ["71", "111", "163", "211"] },
];

export const initialTransportReports: TransportReport[] = [
  {
    id: "tr1", type: "delay", position: { lat: 41.9009, lng: 12.5016 },
    message: "Linea 64 in ritardo di 20+ minuti. Nessun avviso da ATAC. Fermata affollata.",
    author: "Marco R.", timestamp: minutesAgo(3), upvotes: 12, line: "64", stopName: "Termini",
  },
  {
    id: "tr2", type: "cancelled", position: { lat: 41.8964, lng: 12.4825 },
    message: "Il 40 non passa da mezz'ora. Confermato da altri alla fermata. Prendete la metro.",
    author: "Giulia P.", timestamp: minutesAgo(8), upvotes: 8, line: "40", stopName: "Piazza Venezia",
  },
  {
    id: "tr3", type: "crowded", position: { lat: 41.8902, lng: 12.4922 },
    message: "Bus 75 strapieno, impossibile salire. Meglio camminare verso metro B Colosseo.",
    author: "Luca M.", timestamp: minutesAgo(5), upvotes: 15, line: "75", stopName: "Colosseo",
  },
  {
    id: "tr4", type: "alternative", position: { lat: 41.8796, lng: 12.4701 },
    message: "Tram 8 funziona regolarmente! Da Trastevere a Largo Argentina in 10 min.",
    author: "Sara T.", timestamp: minutesAgo(12), upvotes: 6, line: "8", stopName: "Trastevere",
  },
  {
    id: "tr5", type: "strike", position: { lat: 41.9128, lng: 12.4762 },
    message: "Sciopero parziale ATAC: tram 2 e bus 490 non operativi fino alle 17:00.",
    author: "Andrea B.", timestamp: minutesAgo(25), upvotes: 22, stopName: "Flaminio",
  },
  {
    id: "tr6", type: "broken", position: { lat: 41.8859, lng: 12.5064 },
    message: "Tornello metro A San Giovanni guasto. Code lunghe all'ingresso. Usare uscita laterale.",
    author: "Chiara L.", timestamp: minutesAgo(15), upvotes: 11, stopName: "San Giovanni",
  },
  {
    id: "tr7", type: "delay", position: { lat: 41.9104, lng: 12.5300 },
    message: "Treni regionali in ritardo 15-20 min da Tiburtina. Problemi alla linea elettrica.",
    author: "Federico N.", timestamp: minutesAgo(7), upvotes: 9, stopName: "Tiburtina",
  },
];

export const initialSafetyReports: SafetyReport[] = [
  {
    id: "sr1", type: "dark_street", position: { lat: 41.8920, lng: 12.5050 },
    message: "Via Merulana altezza Santa Maria Maggiore: scarsa illuminazione dopo le 22. Meglio restare sul lato sinistro della strada dove ci sono negozi.",
    author: "Elena V.", timestamp: minutesAgo(120), upvotes: 18, confirmedSafe: 3, timeOfDay: "night",
  },
  {
    id: "sr2", type: "theft", position: { lat: 41.9009, lng: 12.5020 },
    message: "Borseggiatori attivi nella zona Termini, specialmente vicino all'ingresso laterale. Attenzione agli zaini.",
    author: "Paolo G.", timestamp: minutesAgo(45), upvotes: 31, confirmedSafe: 0, timeOfDay: "both",
  },
  {
    id: "sr3", type: "dangerous", position: { lat: 41.8850, lng: 12.5120 },
    message: "Sottopasso di San Giovanni di notte poco frequentato. Consiglio di usare l'attraversamento in superficie.",
    author: "Marta C.", timestamp: minutesAgo(200), upvotes: 24, confirmedSafe: 2, timeOfDay: "night",
  },
  {
    id: "sr4", type: "harassment", position: { lat: 41.9015, lng: 12.4960 },
    message: "Zona Via Nazionale di sera: presenza di persone moleste vicino alle fermate bus. Meglio camminare in gruppo.",
    author: "Laura S.", timestamp: minutesAgo(90), upvotes: 15, confirmedSafe: 1, timeOfDay: "night",
  },
  {
    id: "sr5", type: "unsafe_area", position: { lat: 41.8780, lng: 12.5200 },
    message: "Parco di Colle Oppio dopo il tramonto: evitare i sentieri interni. Restare sulla strada principale.",
    author: "Anna M.", timestamp: minutesAgo(300), upvotes: 27, confirmedSafe: 1, timeOfDay: "night",
  },
  {
    id: "sr6", type: "dark_street", position: { lat: 41.8750, lng: 12.4680 },
    message: "Vicoli di Trastevere oltre Piazza Trilussa: bellissimi ma poco illuminati. Di sera meglio restare sulle strade principali.",
    author: "Francesca D.", timestamp: minutesAgo(180), upvotes: 14, confirmedSafe: 5, timeOfDay: "night",
  },
  {
    id: "sr7", type: "vandalism", position: { lat: 41.9080, lng: 12.4500 },
    message: "Auto vandalizzate in zona Prati/Ottaviano. Non lasciare oggetti visibili in macchina.",
    author: "Roberto L.", timestamp: minutesAgo(60), upvotes: 8, confirmedSafe: 0, timeOfDay: "night",
  },
];
