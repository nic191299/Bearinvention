// Shared transit step model used by RoutePanel and NavHUD

export interface TransitStep {
  mode: "TRANSIT" | "WALKING";
  duration: string;
  durationSecs: number;
  // walking
  distance?: string;
  totalDistanceM?: number;
  instruction?: string;
  // transit
  lineName?: string;
  lineShortName?: string;
  vehicleType?: string;
  lineColor?: string;
  lineTextColor?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  departureTimestamp?: number;   // Unix seconds — for live countdown
  arrivalTime?: string;
  arrivalTimestamp?: number;     // Unix seconds
  waitMin?: number;
  numStops?: number;
  // coordinates for live step tracking
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

export function getVehicleIcon(type = ""): string {
  switch (type.toUpperCase()) {
    case "SUBWAY": case "METRO": return "directions_subway";
    case "TRAM": return "tram";
    case "RAIL": case "HEAVY_RAIL": case "COMMUTER_TRAIN": case "LONG_DISTANCE_TRAIN": return "directions_railway";
    case "FERRY": return "directions_boat";
    case "CABLE_CAR": case "GONDOLA": case "FUNICULAR": return "cable_car";
    default: return "directions_bus";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTransitSteps(directions: any): TransitStep[] {
  if (!directions?.routes?.[0]?.legs?.[0]) return [];
  const steps = directions.routes[0].legs[0].steps as any[];
  const result: TransitStep[] = [];
  let lastArrivalTs: number | null = null;

  for (const step of steps) {
    const startLat: number = step.start_location?.lat?.();
    const startLng: number = step.start_location?.lng?.();
    const endLat: number   = step.end_location?.lat?.();
    const endLng: number   = step.end_location?.lng?.();

    if (step.travel_mode === "TRANSIT") {
      const t = step.transit;
      let waitMin: number | undefined;
      if (lastArrivalTs && t?.departure_time?.value) {
        const diff = Math.round((t.departure_time.value - lastArrivalTs) / 60);
        if (diff > 0 && diff < 90) waitMin = diff;
      }
      const raw = t?.line?.color;
      const lineColor = raw ? (raw.startsWith("#") ? raw : `#${raw}`) : "#3b82f6";

      result.push({
        mode: "TRANSIT",
        duration: step.duration?.text || "",
        durationSecs: step.duration?.value || 0,
        lineName: t?.line?.name || "",
        lineShortName: t?.line?.short_name || t?.line?.name || "",
        vehicleType: t?.line?.vehicle?.type || "BUS",
        lineColor,
        lineTextColor: t?.line?.text_color ? (t.line.text_color.startsWith("#") ? t.line.text_color : `#${t.line.text_color}`) : "#ffffff",
        departureStop: t?.departure_stop?.name || "",
        arrivalStop: t?.arrival_stop?.name || "",
        departureTime: t?.departure_time?.text || "",
        departureTimestamp: t?.departure_time?.value,
        arrivalTime: t?.arrival_time?.text || "",
        arrivalTimestamp: t?.arrival_time?.value,
        numStops: t?.num_stops || 0,
        waitMin,
        startLat: t?.departure_stop?.location?.lat?.() ?? startLat,
        startLng: t?.departure_stop?.location?.lng?.() ?? startLng,
        endLat: t?.arrival_stop?.location?.lat?.() ?? endLat,
        endLng: t?.arrival_stop?.location?.lng?.() ?? endLng,
      });
      lastArrivalTs = t?.arrival_time?.value ?? null;

    } else if (step.travel_mode === "WALKING") {
      const txt = (step.instructions || "").replace(/<[^>]*>/g, "").trim();
      result.push({
        mode: "WALKING",
        duration: step.duration?.text || "",
        durationSecs: step.duration?.value || 0,
        distance: step.distance?.text || "",
        totalDistanceM: step.distance?.value || 0,
        instruction: txt.length > 55 ? txt.slice(0, 55) + "…" : txt,
        startLat, startLng, endLat, endLng,
      });
    }
  }
  return result;
}
