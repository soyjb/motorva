import assert from "node:assert/strict";
import test from "node:test";
import { isVehicle, MAX_PHOTO_LENGTH, MAX_YEAR, readVehicles, removeSavedVehicle, updateSavedPhoto } from "./vehicles.ts";

const vehicle = { id: "test-vehicle", year: 2024, make: "Toyota", model: "Camry", mileage: 24000 };

test("new garages are empty and saved vehicles survive a JSON round trip", () => {
  assert.deepEqual(readVehicles(null), []);
  assert.deepEqual(readVehicles(JSON.stringify([vehicle])), [vehicle]);
  assert.ok(isVehicle({ ...vehicle, mileage: 0 }));
});

test("rejects invalid vehicle inputs and unsupported year/mileage values", () => {
  for (const invalid of [null, {}, { ...vehicle, year: MAX_YEAR + 1 }, { ...vehicle, year: 1885 },
    { ...vehicle, year: "2024" }, { ...vehicle, year: 2024.5 }, { ...vehicle, make: "   " },
    { ...vehicle, model: "" }, { ...vehicle, make: "a".repeat(61) }, { ...vehicle, model: "a".repeat(81) },
    { ...vehicle, mileage: -1 }, { ...vehicle, mileage: 1.5 }, { ...vehicle, mileage: 10000000 },
    { ...vehicle, mileage: Infinity }, { ...vehicle, mileage: "100" }, { ...vehicle, id: "" }]) {
    assert.equal(isVehicle(invalid), false);
  }
});

test("rejects corrupt saved data rather than silently replacing a garage", () => {
  for (const raw of ["{", "null", "{}", '["vehicle"]', JSON.stringify([vehicle, { ...vehicle, mileage: -1 }]),
    JSON.stringify([vehicle, vehicle])]) {
    assert.throws(() => readVehicles(raw));
  }
});

test("removes by ID while preserving another vehicle with the same name", () => {
  const other = { ...vehicle, id: "other-vehicle", mileage: 50000 };
  const remaining = removeSavedVehicle(JSON.stringify([vehicle, other]), vehicle.id);
  assert.deepEqual(readVehicles(JSON.stringify(remaining)), [other]);
  assert.deepEqual(removeSavedVehicle(JSON.stringify([vehicle]), vehicle.id), []);
  assert.deepEqual(removeSavedVehicle(JSON.stringify([other]), "already-removed"), [other]);
  assert.throws(() => removeSavedVehicle("{", vehicle.id));
});

test("photo updates preserve all existing vehicles and details", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
  const other = { ...vehicle, id: "other-vehicle", mileage: 50000 };
  const updated = updateSavedPhoto(JSON.stringify([vehicle, other]), vehicle.id, photo);
  assert.deepEqual(readVehicles(JSON.stringify(updated)), [{ ...vehicle, photo }, other]);
  assert.deepEqual(updateSavedPhoto(JSON.stringify(updated), vehicle.id), [vehicle, other]);
  assert.throws(() => updateSavedPhoto(JSON.stringify([other]), vehicle.id, photo));
  assert.throws(() => updateSavedPhoto("{", vehicle.id, photo));
});

test("rejects remote URLs, SVG, invalid base64, and oversized saved photos", () => {
  for (const photo of ["https://example.com/car.jpg", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/jpeg;base64,broken!",
    "data:image/jpeg;base64,/9j/" + "A".repeat(MAX_PHOTO_LENGTH), 123, null]) {
    assert.equal(isVehicle({ ...vehicle, photo }), false);
    assert.throws(() => updateSavedPhoto(JSON.stringify([vehicle]), vehicle.id, photo));
  }
});
