export interface LatLng {
  lat: number;
  lng: number;
}

export interface BusStop {
  id: string;
  name: string;
  position: LatLng;
  lines: string[];
}

export interface TransportReport {
  id: string;
  type: "delay" | "crowded" | "cancelled" | "broken" | "strike" | "alternative";
  position: LatLng;
  message: string;
  author: string;
  timestamp: Date;
  upvotes: number;
  line?: string;
  stopName?: string;
}

export interface SafetyReport {
  id: string;
  type: "theft" | "dark_street" | "dangerous" | "harassment" | "vandalism" | "unsafe_area";
  position: LatLng;
  message: string;
  author: string;
  timestamp: Date;
  upvotes: number;
  confirmedSafe: number;
  timeOfDay: "day" | "night" | "both";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RouteState {
  origin: LatLng | null;
  destination: LatLng | null;
  originText: string;
  destinationText: string;
  mode: google.maps.TravelMode | "SAFE_WALK";
  active: boolean;
}

export const TRANSPORT_TYPES = {
  delay: { label: "Ritardo", color: "#f59e0b", icon: "schedule" },
  crowded: { label: "Affollato", color: "#f97316", icon: "groups" },
  cancelled: { label: "Cancellato", color: "#ef4444", icon: "cancel" },
  broken: { label: "Guasto", color: "#dc2626", icon: "build" },
  strike: { label: "Sciopero", color: "#7c3aed", icon: "front_hand" },
  alternative: { label: "Alternativa", color: "#10b981", icon: "alt_route" },
} as const;

export const SAFETY_TYPES = {
  theft: { label: "Furto", color: "#ef4444", icon: "warning" },
  dark_street: { label: "Strada buia", color: "#6b7280", icon: "dark_mode" },
  dangerous: { label: "Zona pericolosa", color: "#dc2626", icon: "dangerous" },
  harassment: { label: "Molestie", color: "#9333ea", icon: "report" },
  vandalism: { label: "Vandalismo", color: "#f97316", icon: "broken_image" },
  unsafe_area: { label: "Area insicura", color: "#b91c1c", icon: "shield" },
} as const;
