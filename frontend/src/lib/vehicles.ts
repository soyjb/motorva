export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  photo?: string;
};

export const STORAGE_KEY = "motorva.vehicles.v1";
export const MAX_YEAR = new Date().getFullYear() + 1;
export const MAX_PHOTO_LENGTH = 450000;

export function isVehiclePhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PHOTO_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function isVehicle(value: unknown): value is Vehicle {
  if (typeof value !== "object" || value === null) return false;
  const vehicle = value as Record<string, unknown>;
  return (
    typeof vehicle.id === "string" && vehicle.id.length > 0 &&
    Number.isInteger(vehicle.year) && Number(vehicle.year) >= 1886 && Number(vehicle.year) <= MAX_YEAR &&
    typeof vehicle.make === "string" && vehicle.make.trim().length > 0 && vehicle.make.length <= 60 &&
    typeof vehicle.model === "string" && vehicle.model.trim().length > 0 && vehicle.model.length <= 80 &&
    Number.isSafeInteger(vehicle.mileage) && Number(vehicle.mileage) >= 0 && Number(vehicle.mileage) <= 9999999 &&
    (vehicle.photo === undefined || isVehiclePhoto(vehicle.photo))
  );
}

export function readVehicles(raw: string | null): Vehicle[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isVehicle) || new Set(value.map(v => v.id)).size !== value.length) {
    throw new Error("Invalid saved garage");
  }
  return value;
}

export function removeSavedVehicle(raw: string | null, id: string): Vehicle[] {
  return readVehicles(raw).filter(vehicle => vehicle.id !== id);
}

export function updateSavedPhoto(raw: string | null, id: string, photo?: string): Vehicle[] {
  if (photo !== undefined && !isVehiclePhoto(photo)) throw new Error("Invalid vehicle photo");
  const vehicles = readVehicles(raw);
  if (!vehicles.some(vehicle => vehicle.id === id)) throw new Error("Vehicle is no longer in the garage");
  return vehicles.map(vehicle => {
    if (vehicle.id !== id) return vehicle;
    const updated = { ...vehicle };
    if (photo === undefined) delete updated.photo;
    else updated.photo = photo;
    return updated;
  });
}
