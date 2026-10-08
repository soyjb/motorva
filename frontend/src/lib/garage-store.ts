"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readVehicles, STORAGE_KEY, type Vehicle } from "./vehicles";

export const CHANGE_EVENT = "motorva:garage-change";
const UNAVAILABLE = "storage-unavailable";

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function snapshot() {
  try { return window.localStorage.getItem(STORAGE_KEY); }
  catch { return UNAVAILABLE; }
}
const serverSnapshot = () => null;
const clientReady = () => true;
const serverReady = () => false;

export function useGarage() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const saved = useMemo(() => {
    try { return { vehicles: readVehicles(raw), error: "" }; }
    catch { return { vehicles: [] as Vehicle[], error: raw === UNAVAILABLE
      ? "Browser storage is unavailable. Allow site storage and reload to use your garage."
      : "Your saved garage could not be read. It has been kept unchanged. Please restore your browser data before changing vehicles." }; }
  }, [raw]);
  return { ...saved, ready };
}
