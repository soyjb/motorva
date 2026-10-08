import type { Vehicle } from "./vehicles";

export function applyVehicleOrder(vehicles: Vehicle[], ids: string[]): Vehicle[] {
  const byId = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
  if (ids.length !== vehicles.length || new Set(ids).size !== ids.length || ids.some(id => !byId.has(id))) {
    throw new Error("Your garage changed. Close this window and try reordering again.");
  }
  return ids.map(id => byId.get(id)!);
}

export function moveVehicle(ids: string[], source: string, target: string): string[] {
  if (!ids.includes(source) || !ids.includes(target)) throw new Error("Vehicle is no longer available.");
  const next = ids.filter(id => id !== source);
  next.splice(ids.indexOf(target), 0, source);
  return next;
}
