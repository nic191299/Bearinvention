"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LatLng } from "./types";

const ROME_CENTER: LatLng = { lat: 41.9028, lng: 12.4964 };

export function useGeolocation(lazy = false) {
  const [position, setPosition] = useState<LatLng>(ROME_CENTER);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");
  const [started, setStarted] = useState(!lazy);
  const watchIdRef = useRef<number | null>(null);

  // Check permission state (without triggering prompt)
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermissionState(result.state as "prompt" | "granted" | "denied");
      if (result.state === "granted" && lazy) setStarted(true);
      result.addEventListener("change", () => {
        setPermissionState(result.state as "prompt" | "granted" | "denied");
        if (result.state === "granted") setStarted(true);
      });
    }).catch(() => setPermissionState("unknown"));
  }, [lazy]);

  useEffect(() => {
    if (!started || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
        setPermissionState("granted");
      },
      (err) => {
        if (err.code === 1) { setError("denied"); setPermissionState("denied"); }
        else if (err.code === 2) setError("unavailable");
        else setError("timeout");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWatching(true);
        setError(null);
        setPermissionState("granted");
      },
      (err) => { if (err.code === 1) setPermissionState("denied"); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [started]);

  const requestPermission = useCallback(() => {
    setStarted(true);
  }, []);

  const recenter = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, watching, error, recenter, permissionState, requestPermission };
}
