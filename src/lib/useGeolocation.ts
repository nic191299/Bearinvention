"use client";

import { useState, useEffect, useCallback } from "react";
import { LatLng } from "./types";

const ROME_CENTER: LatLng = { lat: 41.9028, lng: 12.4964 };

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng>(ROME_CENTER);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");

  // Check permission state
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissionState(result.state as "prompt" | "granted" | "denied");
        result.addEventListener("change", () => {
          setPermissionState(result.state as "prompt" | "granted" | "denied");
        });
      }).catch(() => {
        // permissions API not supported, try geolocation directly
        setPermissionState("unknown");
      });
    }
  }, []);

  // Start watching position
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalizzazione non supportata dal browser");
      return;
    }

    // Get initial position first (faster)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
        setPermissionState("granted");
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        if (err.code === 1) {
          setError("Permesso negato. Abilita la geolocalizzazione nelle impostazioni del browser.");
          setPermissionState("denied");
        } else if (err.code === 2) {
          setError("Posizione non disponibile. Usando Roma centro come fallback.");
        } else {
          setError("Timeout geolocalizzazione. Usando Roma centro come fallback.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Then watch for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
        setPermissionState("granted");
      },
      (err) => {
        if (err.code === 1) {
          setPermissionState("denied");
        }
        // Don't clear position on watch errors - keep last known
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const recenter = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
      },
      () => {
        // Keep current position
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, watching, error, recenter, permissionState };
}
