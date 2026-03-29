import { LatLng } from "./types";

// Rome neighborhood crime risk zones
// Based on aggregated data from Prefettura di Roma, ISTAT, and Questura reports
// Risk levels: 1 (low) to 5 (very high)
// Categories: pickpocket, theft, robbery, assault, vandalism, drug-related

export interface CrimeZone {
  id: string;
  name: string;
  center: LatLng;
  radius: number; // meters
  riskLevel: 1 | 2 | 3 | 4 | 5;
  riskLabel: string;
  dominant: string; // dominant crime type
  details: string;
  nightRiskMultiplier: number; // how much worse at night (1.0 = same, 2.0 = double)
  stats: {
    pickpocket: number; // 0-5
    theft: number;
    robbery: number;
    assault: number;
    vandalism: number;
  };
}

export const crimeZones: CrimeZone[] = [
  {
    id: "cz1",
    name: "Termini / Esquilino",
    center: { lat: 41.9009, lng: 12.5016 },
    radius: 500,
    riskLevel: 5,
    riskLabel: "Molto alto",
    dominant: "Borseggi e furti",
    details: "Zona con la piu alta concentrazione di borseggi di Roma. Attenzione in stazione, sui bus e nelle vie laterali. Dopo le 22 evitare Via Giolitti e i giardini di Piazza Vittorio.",
    nightRiskMultiplier: 1.8,
    stats: { pickpocket: 5, theft: 4, robbery: 3, assault: 2, vandalism: 3 },
  },
  {
    id: "cz2",
    name: "Colosseo / Fori Imperiali",
    center: { lat: 41.8902, lng: 12.4922 },
    radius: 400,
    riskLevel: 4,
    riskLabel: "Alto",
    dominant: "Borseggi turistici",
    details: "Borseggiatori professionisti attivi tra turisti. Attenzione a gruppi che circondano, finti venditori e distrazioni. Zona sicura la sera grazie a illuminazione.",
    nightRiskMultiplier: 1.2,
    stats: { pickpocket: 5, theft: 3, robbery: 1, assault: 1, vandalism: 1 },
  },
  {
    id: "cz3",
    name: "Trastevere",
    center: { lat: 41.8796, lng: 12.4701 },
    radius: 450,
    riskLevel: 3,
    riskLabel: "Medio",
    dominant: "Furti notturni",
    details: "Di giorno sicuro e vivace. Di notte dopo le 2: risse fuori dai locali, furti in vicoli bui. I vicoli interni poco illuminati sono da evitare per chi cammina da solo/a.",
    nightRiskMultiplier: 2.0,
    stats: { pickpocket: 3, theft: 3, robbery: 2, assault: 2, vandalism: 2 },
  },
  {
    id: "cz4",
    name: "San Lorenzo",
    center: { lat: 41.8963, lng: 12.5168 },
    radius: 400,
    riskLevel: 3,
    riskLabel: "Medio",
    dominant: "Furti e spaccio",
    details: "Quartiere universitario, vivace la sera. Attenzione a furti di bici e motorini. Alcune zone poco illuminate verso il cimitero Verano.",
    nightRiskMultiplier: 1.6,
    stats: { pickpocket: 2, theft: 3, robbery: 2, assault: 2, vandalism: 3 },
  },
  {
    id: "cz5",
    name: "Pigneto",
    center: { lat: 41.8895, lng: 12.5283 },
    radius: 350,
    riskLevel: 3,
    riskLabel: "Medio",
    dominant: "Micro-criminalita",
    details: "Zona in forte gentrificazione. Via del Pigneto pedonale e sicura di sera. Vie laterali meno frequentate. Presenza di spaccio nelle traverse.",
    nightRiskMultiplier: 1.5,
    stats: { pickpocket: 2, theft: 3, robbery: 2, assault: 1, vandalism: 3 },
  },
  {
    id: "cz6",
    name: "Piazza Venezia / Centro Storico",
    center: { lat: 41.8964, lng: 12.4825 },
    radius: 500,
    riskLevel: 3,
    riskLabel: "Medio",
    dominant: "Borseggi su bus",
    details: "Borseggi concentrati su linee 40 e 64 (le piu turistiche). Piazze e vie principali sicure. Attenzione ai mercatini e alle zone affollate.",
    nightRiskMultiplier: 1.1,
    stats: { pickpocket: 4, theft: 2, robbery: 1, assault: 1, vandalism: 1 },
  },
  {
    id: "cz7",
    name: "Prati / Ottaviano",
    center: { lat: 41.9073, lng: 12.4487 },
    radius: 500,
    riskLevel: 1,
    riskLabel: "Basso",
    dominant: "Furti auto",
    details: "Quartiere residenziale molto sicuro. Rari episodi di furti in auto parcheggiate. Zona ben illuminata e frequentata anche di sera.",
    nightRiskMultiplier: 1.1,
    stats: { pickpocket: 1, theft: 2, robbery: 1, assault: 1, vandalism: 1 },
  },
  {
    id: "cz8",
    name: "EUR",
    center: { lat: 41.8299, lng: 12.4677 },
    radius: 600,
    riskLevel: 1,
    riskLabel: "Basso",
    dominant: "Furti auto",
    details: "Quartiere direzionale, molto sicuro di giorno. Poco frequentato la sera - strade larghe e illuminate ma deserte. Parco del Lago meno sicuro dopo il tramonto.",
    nightRiskMultiplier: 1.5,
    stats: { pickpocket: 1, theft: 1, robbery: 1, assault: 1, vandalism: 1 },
  },
  {
    id: "cz9",
    name: "Testaccio",
    center: { lat: 41.8760, lng: 12.4756 },
    radius: 350,
    riskLevel: 2,
    riskLabel: "Basso-Medio",
    dominant: "Risse notturne",
    details: "Quartiere sicuro e popolare. La sera zona movida con possibili risse fuori dai locali. Monte Testaccio ben frequentato ma rumoroso nel weekend.",
    nightRiskMultiplier: 1.4,
    stats: { pickpocket: 1, theft: 2, robbery: 1, assault: 2, vandalism: 2 },
  },
  {
    id: "cz10",
    name: "Tor Bella Monaca",
    center: { lat: 41.8680, lng: 12.6090 },
    radius: 700,
    riskLevel: 5,
    riskLabel: "Molto alto",
    dominant: "Spaccio e rapine",
    details: "Quartiere periferico con alta concentrazione di criminalita. Presenza di spaccio organizzato. Sconsigliato attraversare a piedi, soprattutto di notte.",
    nightRiskMultiplier: 2.0,
    stats: { pickpocket: 2, theft: 4, robbery: 4, assault: 3, vandalism: 4 },
  },
  {
    id: "cz11",
    name: "San Basilio",
    center: { lat: 41.9435, lng: 12.5530 },
    radius: 500,
    riskLevel: 4,
    riskLabel: "Alto",
    dominant: "Spaccio",
    details: "Quartiere popolare con problemi di spaccio. Alcune piazze da evitare la sera. Presenza di forze dell'ordine ma situazione instabile.",
    nightRiskMultiplier: 1.8,
    stats: { pickpocket: 1, theft: 3, robbery: 3, assault: 3, vandalism: 3 },
  },
  {
    id: "cz12",
    name: "Colle Oppio / Parco",
    center: { lat: 41.8920, lng: 12.4960 },
    radius: 250,
    riskLevel: 4,
    riskLabel: "Alto (notte)",
    dominant: "Aggressioni notturne",
    details: "Parco bellissimo di giorno. Dopo il tramonto: presenza di senzatetto, scarsa illuminazione nei sentieri interni. Restare sulla strada principale (Via Labicana).",
    nightRiskMultiplier: 2.5,
    stats: { pickpocket: 2, theft: 3, robbery: 3, assault: 3, vandalism: 2 },
  },
  {
    id: "cz13",
    name: "Piazza del Popolo / Flaminio",
    center: { lat: 41.9107, lng: 12.4765 },
    radius: 400,
    riskLevel: 1,
    riskLabel: "Basso",
    dominant: "Borseggi rari",
    details: "Zona molto sicura, ben illuminata e frequentata. Rari casi di borseggio nelle ore di punta turistica.",
    nightRiskMultiplier: 1.0,
    stats: { pickpocket: 2, theft: 1, robbery: 1, assault: 1, vandalism: 1 },
  },
  {
    id: "cz14",
    name: "Ostiense / Gazometro",
    center: { lat: 41.8680, lng: 12.4800 },
    radius: 400,
    riskLevel: 2,
    riskLabel: "Basso-Medio",
    dominant: "Furti bici",
    details: "Zona universitaria in trasformazione. Sicura di giorno. Alcune aree industriali dismesse poco raccomandate di notte. Lungo il Tevere poca illuminazione.",
    nightRiskMultiplier: 1.6,
    stats: { pickpocket: 1, theft: 3, robbery: 1, assault: 1, vandalism: 2 },
  },
];

export const RISK_COLORS: Record<number, string> = {
  1: "#22c55e", // green
  2: "#84cc16", // lime
  3: "#eab308", // yellow
  4: "#f97316", // orange
  5: "#ef4444", // red
};

export const RISK_LABELS: Record<number, string> = {
  1: "Basso",
  2: "Basso-Medio",
  3: "Medio",
  4: "Alto",
  5: "Molto alto",
};
