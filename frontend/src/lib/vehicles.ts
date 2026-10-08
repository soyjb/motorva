export type ServiceRecord = {
  id: string;
  title: string;
  date: string;
  mileage: number;
  costCents?: number;
  notes: string;
};

export function isServiceRecord(value: unknown): value is ServiceRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const date = typeof record.date === "string" ? record.date : "";
  return typeof record.id === "string" && record.id.length > 0 &&
    typeof record.title === "string" && record.title.trim().length > 0 && record.title.length <= 80 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "1886-01-01" &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date &&
    Number.isSafeInteger(record.mileage) && Number(record.mileage) >= 0 && Number(record.mileage) <= 9999999 &&
    (record.costCents === undefined || (Number.isSafeInteger(record.costCents) && Number(record.costCents) >= 0 && Number(record.costCents) <= 99999999)) &&
    typeof record.notes === "string" && record.notes.length <= 2000;
}

export function localDateToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function parseServiceCost(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) throw new Error("Enter a cost with up to two decimal places");
  const [dollars, cents = ""] = text.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  photo?: string;
  services?: ServiceRecord[];
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
    (vehicle.photo === undefined || isVehiclePhoto(vehicle.photo)) &&
    (vehicle.services === undefined || (Array.isArray(vehicle.services) && vehicle.services.every(isServiceRecord) &&
      new Set(vehicle.services.map(record => record.id)).size === vehicle.services.length))
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

export type VehicleDetails = Pick<Vehicle, "year" | "make" | "model" | "mileage">;

export function saveServiceRecord(raw: string | null, vehicleId: string, record: ServiceRecord, editing = false): Vehicle[] {
  const clean = { ...record, title: record.title.trim(), notes: record.notes.trim() };
  if (!isServiceRecord(clean) || clean.date > localDateToday()) throw new Error("Enter valid completed service details");
  const vehicles = readVehicles(raw);
  const target = vehicles.find(vehicle => vehicle.id === vehicleId);
  if (!target) throw new Error("Vehicle is no longer in the garage");
  const services = target.services ?? [];
  const exists = services.some(item => item.id === clean.id);
  if (editing !== exists) throw new Error("Service record changed or was removed");
  const updated = editing ? services.map(item => item.id === clean.id ? clean : item) : [...services, clean];
  return vehicles.map(vehicle => vehicle.id === vehicleId ? { ...vehicle, services: updated } : vehicle);
}

export function removeServiceRecord(raw: string | null, vehicleId: string, recordId: string): Vehicle[] {
  const vehicles = readVehicles(raw);
  if (!vehicles.some(vehicle => vehicle.id === vehicleId)) throw new Error("Vehicle is no longer in the garage");
  return vehicles.map(vehicle => vehicle.id === vehicleId ? { ...vehicle, services: (vehicle.services ?? []).filter(record => record.id !== recordId) } : vehicle);
}

export function updateSavedDetails(raw: string | null, id: string, details: VehicleDetails): Vehicle[] {
  const clean = { year: details.year, make: details.make.trim(), model: details.model.trim(), mileage: details.mileage };
  if (!isVehicle({ id, ...clean })) throw new Error("Invalid vehicle details");
  const vehicles = readVehicles(raw);
  if (!vehicles.some(vehicle => vehicle.id === id)) throw new Error("Vehicle is no longer in the garage");
  return vehicles.map(vehicle => vehicle.id === id ? { ...vehicle, ...clean } : vehicle);
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
