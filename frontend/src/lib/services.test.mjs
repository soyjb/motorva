import assert from "node:assert/strict";
import test from "node:test";
import { isServiceRecord, localDateToday, parseServiceCost, readVehicles, removeServiceRecord, saveServiceRecord, updateSavedDetails, updateSavedPhoto } from "./vehicles.ts";

const vehicle = { id: "car", year: 2024, make: "Toyota", model: "Camry", mileage: 35000 };
const record = { id: "service", title: "Oil change", date: "2024-02-29", mileage: 24000, costCents: 7599, notes: "New filter" };

test("costs use exact integer cents and distinguish missing from free", () => {
  assert.equal(parseServiceCost(""), undefined);
  assert.equal(parseServiceCost("0"), 0);
  assert.equal(parseServiceCost(" 75.99 "), 7599);
  assert.equal(parseServiceCost("1.1"), 110);
  assert.equal(parseServiceCost("999999.99"), 99999999);
  for (const cost of ["-1", "1.001", "1000000", "Infinity", "abc", "1e2"]) assert.throws(() => parseServiceCost(cost));
});

test("validates calendar dates, text limits, mileage, and cents", () => {
  assert.ok(isServiceRecord(record));
  for (const invalid of [{ ...record, date: "2023-02-29" }, { ...record, date: "2024-04-31" }, { ...record, date: "1800-01-01" },
    { ...record, title: " " }, { ...record, title: "a".repeat(81) }, { ...record, mileage: -1 }, { ...record, mileage: 0.1 },
    { ...record, costCents: 1.1 }, { ...record, costCents: -1 }, { ...record, notes: "a".repeat(2001) }]) assert.equal(isServiceRecord(invalid), false);
  assert.throws(() => saveServiceRecord(JSON.stringify([vehicle]), vehicle.id, { ...record, date: "9999-01-01" }));
  assert.match(localDateToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test("adds to legacy garages without changing odometer, photo, or other vehicles", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
  const other = { ...vehicle, id: "other" };
  const updated = saveServiceRecord(JSON.stringify([{ ...vehicle, photo }, other]), vehicle.id, { ...record, title: " Oil change ", notes: " New filter " });
  assert.deepEqual(readVehicles(JSON.stringify(updated)), [{ ...vehicle, photo, services: [record] }, other]);
});

test("edits and removes one record while preserving newer records and unrelated vehicles", () => {
  const second = { ...record, id: "second", title: "Tires" };
  const other = { ...vehicle, id: "other", services: [record] };
  const raw = JSON.stringify([{ ...vehicle, services: [record, second] }, other]);
  const edited = saveServiceRecord(raw, vehicle.id, { ...record, costCents: 0 }, true);
  assert.deepEqual(edited[0].services, [{ ...record, costCents: 0 }, second]);
  assert.deepEqual(removeServiceRecord(JSON.stringify(edited), vehicle.id, record.id), [{ ...vehicle, services: [second] }, other]);
  assert.deepEqual(updateSavedDetails(raw, vehicle.id, { ...vehicle, mileage: 36000 })[0].services, [record, second]);
  assert.deepEqual(updateSavedPhoto(raw, vehicle.id)[0].services, [record, second]);
});

test("rejects corrupt history, duplicate IDs, and writes to removed records or vehicles", () => {
  const raw = JSON.stringify([{ ...vehicle, services: [record] }]);
  assert.throws(() => saveServiceRecord(raw, vehicle.id, record));
  assert.throws(() => saveServiceRecord(raw, vehicle.id, { ...record, id: "missing" }, true));
  assert.throws(() => saveServiceRecord(raw, "missing-car", record));
  assert.throws(() => removeServiceRecord(raw, "missing-car", record.id));
  assert.throws(() => removeServiceRecord("{", vehicle.id, record.id));
  assert.throws(() => readVehicles(JSON.stringify([{ ...vehicle, services: [record, record] }])));
  assert.throws(() => readVehicles(JSON.stringify([{ ...vehicle, services: [{ ...record, mileage: -1 }] }])));
});
