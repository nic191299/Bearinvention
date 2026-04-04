export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeConfidence(confirms: number, denials: number): number {
  return 1.0 + confirms * 0.2 - denials * 0.3;
}

export function isReportActive(confirms: number, denials: number, expiresAt: string | Date): boolean {
  const expired = new Date(expiresAt) < new Date();
  if (expired) return false;
  return computeConfidence(confirms, denials) >= 0.2;
}

export function getExpiryMinutes(type: string): number {
  switch (type) {
    case "slowdown": return 30;
    case "danger": return 120;
    case "road_closed": return 360;
    case "dark_street": return 1440;
    case "theft": return 720;
    case "harassment": return 720;
    default: return 60;
  }
}
