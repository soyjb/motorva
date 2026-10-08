"use client";

import { getSupabase } from "./supabase";
import { readVehicles, STORAGE_KEY, type Vehicle } from "./vehicles";
import { applyVehicleOrder } from "./vehicle-order";

export const CHANGE_EVENT = "motorva:garage-change";
let saving = false;
export const isGarageSaving = () => saving;

async function session() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function request(owner: string, path = "", method = "GET", vehicle?: Vehicle | { ids: string[] }) {
  const current = await session();
  if (!current || current.user.id !== owner) throw new Error("Your account changed. Please try again.");
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("Account storage isn't configured yet.");
  const response = await fetch(`${base.replace(/\/$/, "")}/api/vehicles${path}`, {
    method, headers: { Authorization: `Bearer ${current.access_token}`, ...(vehicle ? { "Content-Type": "application/json" } : {}) },
    ...(vehicle ? { body: JSON.stringify(vehicle) } : {}), signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session expired. Sign in again.");
    if (response.status === 400) throw new Error("The backend rejected the vehicle or photo format. If you just updated Motorva, restart the backend and try again.");
    if (response.status === 413) throw new Error("The photo is too large for the server. Try a smaller image.");
    if (response.status === 409) throw new Error("Your garage changed. Close this window and try reordering again.");
    if (response.status === 405) throw new Error("Restart the Motorva backend to enable the new garage order feature.");
    throw new Error("Account storage couldn't be updated. Check the backend and try again.");
  }
  return response.status === 204 ? undefined : response.json();
}

export async function loadAccountGarage(owner: string): Promise<Vehicle[]> {
  return readVehicles(JSON.stringify(await request(owner)));
}

export async function saveGarageOrder(ids: string[]) {
  if (saving) throw new Error("Another change is still saving. Please wait.");
  saving = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    const current = await session();
    if (current) {
      await request(current.user.id, "/order", "PUT", { ids });
    } else {
      const next = applyVehicleOrder(readVehicles(window.localStorage.getItem(STORAGE_KEY)), ids);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } finally {
    saving = false;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export async function mutateGarage(update: (raw: string | null) => Vehicle[]) {
  if (saving) throw new Error("Another change is still saving. Please wait.");
  saving = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    const current = await session();
    if (!current) {
      const next = update(window.localStorage.getItem(STORAGE_KEY));
      readVehicles(JSON.stringify(next));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return;
    }
    const owner = current.user.id;
    const previous = await loadAccountGarage(owner);
    const next = update(JSON.stringify(previous));
    readVehicles(JSON.stringify(next));
    const removed = previous.filter(vehicle => !next.some(item => item.id === vehicle.id));
    const changed = next.filter(vehicle => JSON.stringify(vehicle) !== JSON.stringify(previous.find(item => item.id === vehicle.id)));
    // Each UI action changes one vehicle, so completing a reminder and adding
    // its history are committed as one database row update.
    if (removed.length + changed.length > 1) throw new Error("Only one vehicle can be changed at a time.");
    for (const vehicle of removed) await request(owner, `/${encodeURIComponent(vehicle.id)}`, "DELETE");
    for (const vehicle of changed) await request(owner, `/${encodeURIComponent(vehicle.id)}`, "PUT", vehicle);
  } finally {
    saving = false;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export async function importBrowserGarage(): Promise<number> {
  if (saving) throw new Error("Please wait for the current save.");
  saving = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    const current = await session();
    if (!current) throw new Error("Sign in first.");
    const local = readVehicles(window.localStorage.getItem(STORAGE_KEY));
    const existing = await loadAccountGarage(current.user.id);
    let count = 0;
    for (const vehicle of local) {
      if (existing.some(item => item.id === vehicle.id)) continue;
      await request(current.user.id, `/${encodeURIComponent(vehicle.id)}`, "PUT", vehicle);
      count++;
    }
    return count;
  } finally {
    saving = false;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}
