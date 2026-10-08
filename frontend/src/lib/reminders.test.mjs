import assert from "node:assert/strict";
import test from "node:test";
import { changeReminder, completeReminderWithService, isReminder, readVehicles, reminderStatus, saveReminder, updateSavedDetails } from "./vehicles.ts";

const car = { id: "car", year: 2024, make: "Toyota", model: "Camry", mileage: 35000 };
const item = { id: "oil", title: "Oil change", dueDate: "2026-11-08", dueMileage: 40000 };
const today = "2026-10-08";

test("completion adds actual service details and completes the matching reminder in one result", () => {
  const second = { ...item, id: "tires", title: "Tires" };
  const other = { ...car, id: "other" };
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
  const existing = { id: "previous", title: "Tires", date: "2026-01-01", mileage: 30000, notes: "" };
  const record = { id: "completion", title: item.title, date: "2026-02-01", mileage: 33000, costCents: 7599, notes: "New filter" };
  const raw = JSON.stringify([{ ...car, photo, services: [existing], reminders: [item, second] }, other]);
  const result = completeReminderWithService(raw, car.id, item.id, record);
  assert.deepEqual(readVehicles(JSON.stringify(result)), [{ ...car, photo, services: [existing, record], reminders: [{ ...item, completedDate: record.date }, second] }, other]);
  assert.throws(() => completeReminderWithService(JSON.stringify(result), car.id, item.id, { ...record, id: "duplicate-click" }));
  const reopened = changeReminder(JSON.stringify(result), car.id, item.id, "reopen");
  assert.deepEqual(reopened[0].services, [existing, record]);
  const completedAgain = completeReminderWithService(JSON.stringify(reopened), car.id, item.id, { ...record, id: "new-service" });
  assert.equal(completedAgain[0].services.length, 3);
});

test("failed completion produces no partial update for invalid service, removed reminder, or corrupt storage", () => {
  const raw = JSON.stringify([{ ...car, reminders: [item] }]);
  const record = { id: "s", title: item.title, date: "2026-02-01", mileage: 33000, notes: "" };
  for (const invalid of [{ ...record, mileage: -1 }, { ...record, date: "9999-01-01" }, { ...record, costCents: -1 }]) {
    assert.throws(() => completeReminderWithService(raw, car.id, item.id, invalid));
  }
  assert.throws(() => completeReminderWithService(raw, car.id, "removed", record));
  assert.throws(() => completeReminderWithService(raw, "removed-car", item.id, record));
  assert.throws(() => completeReminderWithService("{", car.id, item.id, record));
  assert.equal(readVehicles(raw)[0].reminders[0].completedDate, undefined);
  assert.equal(readVehicles(raw)[0].services, undefined);
});

test("due status uses either target, with exact date and mileage boundaries", () => {
  assert.equal(reminderStatus(item, 35000, today), "Upcoming");
  assert.equal(reminderStatus({ ...item, dueDate: "2026-11-07" }, 35000, today), "Due soon");
  assert.equal(reminderStatus(item, 39500, today), "Due soon");
  assert.equal(reminderStatus(item, 39499, today), "Upcoming");
  assert.equal(reminderStatus(item, 40000, today), "Due now");
  assert.equal(reminderStatus(item, 40001, today), "Overdue");
  assert.equal(reminderStatus({ ...item, dueDate: today }, 35000, today), "Due now");
  assert.equal(reminderStatus({ ...item, dueDate: "2026-10-07" }, 35000, today), "Overdue");
  assert.equal(reminderStatus({ ...item, dueDate: "2026-10-07" }, 40000, today), "Overdue");
  assert.equal(reminderStatus({ ...item, completedDate: today }, 90000, today), "Completed");
  assert.equal(reminderStatus({ id: "m", title: "Mileage", dueMileage: 0 }, 0, today), "Due now");
  assert.equal(reminderStatus({ id: "d", title: "Date", dueDate: "2026-10-09" }, 90000, today), "Due soon");
});

test("validates at least one target, true calendar dates, whole mileage, and titles", () => {
  assert.ok(isReminder(item));
  for (const invalid of [{ id: "x", title: "None" }, { ...item, title: " " }, { ...item, dueDate: "2026-02-29" },
    { ...item, dueDate: "2026-04-31" }, { ...item, dueMileage: -1 }, { ...item, dueMileage: 0.5 }, { ...item, dueMileage: 10000000 },
    { ...item, completedDate: "bad" }, { ...item, title: "x".repeat(81) }]) assert.equal(isReminder(invalid), false);
});

test("legacy garages load and reminders preserve service records, photos, and other vehicles", () => {
  const other = { ...car, id: "other" };
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
  const original = { ...car, photo, services: [{ id: "s", title: "Tires", date: "2026-01-01", mileage: 30000, notes: "" }] };
  const saved = saveReminder(JSON.stringify([original, other]), car.id, item);
  assert.deepEqual(readVehicles(JSON.stringify(saved)), [{ ...original, reminders: [item] }, other]);
  const updated = updateSavedDetails(JSON.stringify(saved), car.id, { ...car, mileage: 40001 });
  assert.equal(reminderStatus(updated[0].reminders[0], updated[0].mileage, today), "Overdue");
  assert.deepEqual(updated[0].services, original.services);
});

test("editing, completion, reopening, and removal preserve other reminders and latest mileage", () => {
  const second = { ...item, id: "tires", title: "Tires" };
  const raw = JSON.stringify([{ ...car, reminders: [item, second] }]);
  const edited = saveReminder(raw, car.id, { ...item, dueMileage: 45000 }, true);
  const completed = changeReminder(JSON.stringify(edited), car.id, item.id, "complete");
  assert.equal(reminderStatus(completed[0].reminders[0], 90000, today), "Completed");
  const reopened = changeReminder(JSON.stringify(completed), car.id, item.id, "reopen");
  assert.equal(reopened[0].reminders[0].completedDate, undefined);
  assert.deepEqual(changeReminder(JSON.stringify(reopened), car.id, item.id, "remove")[0].reminders, [second]);
  assert.equal(completed[0].mileage, car.mileage);
  assert.equal(completed[0].services, undefined);
});

test("rejects corrupt storage, duplicates, and removed reminder or vehicle writes", () => {
  const raw = JSON.stringify([{ ...car, reminders: [item] }]);
  assert.throws(() => saveReminder(raw, car.id, item));
  assert.throws(() => saveReminder(raw, car.id, { ...item, id: "missing" }, true));
  assert.throws(() => saveReminder(raw, "removed", item));
  assert.throws(() => changeReminder(raw, car.id, "removed", "complete"));
  assert.throws(() => changeReminder("{", car.id, item.id, "remove"));
  assert.throws(() => readVehicles(JSON.stringify([{ ...car, reminders: [item, item] }])));
});
