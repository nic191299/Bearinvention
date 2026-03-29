export interface LatLng {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  type: "road_closed" | "danger" | "slowdown";
  position: LatLng;
  timestamp: Date;
  upvotes: number;
}

export interface NewsAlert {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  category: "strike" | "road_closure" | "event" | "transport" | "general";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const REPORT_CONFIG = {
  road_closed: { label: "Strada chiusa", icon: "block", color: "#f97316" },
  danger: { label: "Pericolo", icon: "warning", color: "#ef4444" },
  slowdown: { label: "Rallentamento", icon: "speed", color: "#eab308" },
} as const;
