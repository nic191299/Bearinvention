export interface LatLng {
  lat: number;
  lng: number;
}

export type ReportType = "road_closed" | "danger" | "slowdown" | "dark_street" | "theft" | "harassment";

export interface Report {
  id: string;
  type: ReportType;
  position: LatLng;
  timestamp: Date;
  confirms: number;
  denials: number;
  expiresAt: Date;
  sessionId?: string;
  // legacy compat
  upvotes?: number;
}

export interface NewsAlert {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  category: "strike" | "road_closure" | "event" | "transport" | "crime" | "general";
  position?: LatLng; // geocoded location if available
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RouteWarning {
  type: ReportType;
  label: string;
  color: string;
  count: number;
}

export const REPORT_CONFIG = {
  road_closed: { label: "Strada chiusa", icon: "block", color: "#f97316" },
  danger: { label: "Pericolo", icon: "warning", color: "#ef4444" },
  slowdown: { label: "Rallentamento", icon: "speed", color: "#eab308" },
  dark_street: { label: "Strada buia", icon: "dark_mode", color: "#6366f1" },
  theft: { label: "Furto/Borseggio", icon: "local_police", color: "#dc2626" },
  harassment: { label: "Molestie", icon: "report", color: "#9333ea" },
} as const;

export const SAFETY_TYPES: ReportType[] = ["dark_street", "theft", "harassment"];
export const MOBILITY_TYPES: ReportType[] = ["road_closed", "danger", "slowdown"];
