export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface CommunityReport {
  id: string;
  type: "delay" | "crowded" | "cancelled" | "info" | "alternative";
  stopId?: string;
  lat: number;
  lng: number;
  message: string;
  author: string;
  timestamp: Date;
  upvotes: number;
}

export interface Alternative {
  type: "walk" | "bike" | "bus" | "metro";
  title: string;
  description: string;
  duration: string;
  distance?: string;
  icon: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
