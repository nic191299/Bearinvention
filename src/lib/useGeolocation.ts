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

  // When parent flips lazy from true → false (e.g. returning user / after grant),
  // immediately start watching without needing a button press.
  useEffect(() => {
    if (!lazy) setStarted(true);
  }, [lazy]);

  // Check permission state (without triggering browser prompt)
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermissionState(result.state as "prompt" | "granted" | "denied");
      // Auto-start if already granted (e.g. returning user)
      if (result.state === "granted" && lazy) setStarted(true);
      result.addEventListener("change", () => {
        setPermissionState(result.state as "prompt" | "granted" | "denied");
        if (result.state === "granted") setStarted(true);
      });
    }).catch(() => setPermissionState("unknown"));
  }, [lazy]);

  // Start watching once started=true
  useEffect(() => {
    if (!started || !navigator.geolocation) return;
    if (watchIdRef.current !== null) return; // already watching

    watchIdRef.current = navigator.geolocation.watchPosition(
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
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [started]);

  // Called from button click — triggers the browser's native permission dialog
  // Must run directly in the event handler (not in a useEffect) to satisfy iOS gesture requirement
  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) return;
    setStarted(true);
    // Immediately call getCurrentPosition in the user-gesture context
    // so iOS/Android shows the native permission prompt right away
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermissionState("granted");
        setWatching(true);
        setError(null);
      },
      (err) => {
        if (err.code === 1) { setPermissionState("denied"); setError("denied"); }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const recenter = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, watching, error, recenter, permissionState, requestPermission };
}
