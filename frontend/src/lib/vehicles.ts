export type MaintenanceReminder = {
  id: string;
  title: string;
  dueDate?: string;
  dueMileage?: number;
  completedDate?: string;
};

function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1886-01-01" &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function isReminder(value: unknown): value is MaintenanceReminder {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 && typeof item.title === "string" &&
    item.title.trim().length > 0 && item.title.length <= 80 &&
    (item.dueDate !== undefined || item.dueMileage !== undefined) &&
    (item.dueDate === undefined || isCalendarDate(item.dueDate)) &&
    (item.dueMileage === undefined || (Number.isSafeInteger(item.dueMileage) && Number(item.dueMileage) >= 0 && Number(item.dueMileage) <= 9999999)) &&
    (item.completedDate === undefined || isCalendarDate(item.completedDate));
}

export function reminderStatus(item: MaintenanceReminder, mileage: number, today = localDateToday()): "Completed" | "Overdue" | "Due now" | "Due soon" | "Upcoming" {
  if (item.completedDate) return "Completed";
  const days = item.dueDate === undefined ? Infinity : (Date.parse(item.dueDate) - Date.parse(today)) / 86400000;
  const miles = item.dueMileage === undefined ? Infinity : item.dueMileage - mileage;
  if (days < 0 || miles < 0) return "Overdue";
  if (days === 0 || miles === 0) return "Due now";
  if (days <= 30 || miles <= 500) return "Due soon";
  return "Upcoming";
}

export function saveReminder(raw: string | null, vehicleId: string, reminder: MaintenanceReminder, editing = false): Vehicle[] {
  const clean = { ...reminder, title: reminder.title.trim() };
  if (!isReminder(clean)) throw new Error("Enter a title and valid due date or mileage");
  const vehicles = readVehicles(raw);
  const target = vehicles.find(vehicle => vehicle.id === vehicleId);
  if (!target) throw new Error("Vehicle removed");
  const items = target.reminders ?? [];
  if (items.some(item => item.id === clean.id) !== editing) throw new Error("Reminder changed or removed");
  return vehicles.map(vehicle => vehicle.id === vehicleId ? { ...vehicle, reminders: editing ? items.map(item => item.id === clean.id ? clean : item) : [...items, clean] } : vehicle);
}

export function changeReminder(raw: string | null, vehicleId: string, id: string, action: "complete" | "reopen" | "remove"): Vehicle[] {
  const vehicles = readVehicles(raw);
  const target = vehicles.find(vehicle => vehicle.id === vehicleId);
  if (!target || !target.reminders?.some(item => item.id === id)) throw new Error("Reminder removed");
  const reminders = action === "remove" ? target.reminders.filter(item => item.id !== id) : target.reminders.map(item => {
    if (item.id !== id) return item;
    const updated = { ...item };
    if (action === "complete") updated.completedDate = localDateToday();
    else delete updated.completedDate;
    return updated;
  });
  return vehicles.map(vehicle => vehicle.id === vehicleId ? { ...vehicle, reminders } : vehicle);
}

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
  reminders?: MaintenanceReminder[];
};

export const STORAGE_KEY = "motorva.vehicles.v1";
export const MAX_YEAR = new Date().getFullYear() + 1;
export const MAX_PHOTO_LENGTH = 450000;

export function isVehiclePhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PHOTO_LENGTH &&
    /^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]+={0,2}$/.test(value);
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
      new Set(vehicle.services.map(record => record.id)).size === vehicle.services.length)) &&
    (vehicle.reminders === undefined || (Array.isArray(vehicle.reminders) && vehicle.reminders.every(isReminder) &&
      new Set(vehicle.reminders.map(item => item.id)).size === vehicle.reminders.length))
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

export function completeReminderWithService(raw: string | null, vehicleId: string, reminderId: string, record: ServiceRecord): Vehicle[] {
  const vehicles = readVehicles(raw);
  const target = vehicles.find(vehicle => vehicle.id === vehicleId);
  const reminder = target?.reminders?.find(item => item.id === reminderId);
  if (!reminder || reminder.completedDate) throw new Error("Reminder removed or already completed");
  // Build both changes before the caller makes a single storage write.
  const updated = saveServiceRecord(raw, vehicleId, record);
  return updated.map(vehicle => vehicle.id === vehicleId ? {
    ...vehicle,
    reminders: vehicle.reminders?.map(item => item.id === reminderId ? { ...item, completedDate: record.date } : item),
  } : vehicle);
}

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
