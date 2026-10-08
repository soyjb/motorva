"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { readVehicles, STORAGE_KEY, type Vehicle } from "./vehicles";
import { useAuth } from "@/app/auth-provider";
import { CHANGE_EVENT, isGarageSaving, loadAccountGarage } from "./garage-api";

export { CHANGE_EVENT, mutateGarage } from "./garage-api";
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
  const auth = useAuth();
  const owner = auth.session?.user.id;
  const [cloud, setCloud] = useState<{ owner: string; vehicles: Vehicle[]; ready: boolean; error: string } | null>(null);
  const saving = useSyncExternalStore(subscribe, isGarageSaving, serverReady);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    let generation = 0;
    const refresh = () => {
      const current = ++generation;
      loadAccountGarage(owner).then(vehicles => {
        if (active && generation === current) setCloud({ owner, vehicles, ready: true, error: "" });
      }).catch(() => {
        if (active && generation === current) setCloud({ owner, vehicles: [], ready: true, error: "Your account garage couldn't load. Check that the Motorva backend is running, then retry. Your browser garage is kept separately." });
      });
    };
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener(CHANGE_EVENT, refresh); window.removeEventListener("focus", refresh); };
  }, [owner]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const saved = useMemo(() => {
    try { return { vehicles: readVehicles(raw), error: "" }; }
    catch { return { vehicles: [] as Vehicle[], error: raw === UNAVAILABLE
      ? "Browser storage is unavailable. Allow site storage and reload to use your garage."
      : "Your saved garage could not be read. It has been kept unchanged. Please restore your browser data before changing vehicles." }; }
  }, [raw]);
  const pendingImports = owner && ready && !saved.error && cloud?.owner === owner && cloud.ready && !cloud.error
    ? saved.vehicles.filter(vehicle => !cloud.vehicles.some(item => item.id === vehicle.id)).length : 0;
  if (!auth.ready) return { vehicles: [] as Vehicle[], ready: false, error: "", saving, account: false, pendingImports: 0 };
  if (owner) return { vehicles: cloud?.owner === owner ? cloud.vehicles : [], ready: cloud?.owner === owner && cloud.ready,
    error: cloud?.owner === owner ? cloud.error : "", saving, account: true, pendingImports };
  return { ...saved, ready, saving, account: false, pendingImports: 0 };
}
