"use client";

import { useState, useEffect, useCallback } from "react";
import { LatLng } from "./types";

const ROME_CENTER: LatLng = { lat: 41.9028, lng: 12.4964 };

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng>(ROME_CENTER);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalizzazione non supportata");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
      },
      (err) => {
        setError(err.message);
        // Keep Rome center as fallback
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const recenter = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  return { position, watching, error, recenter };
}
