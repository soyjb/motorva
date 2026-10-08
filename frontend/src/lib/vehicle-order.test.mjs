import test from "node:test";
import assert from "node:assert/strict";
import { applyVehicleOrder, moveVehicle } from "./vehicle-order.ts";

test("reordering preserves latest vehicle data and supports both directions", () => {
  const vehicles = [{ id: "a", mileage: 55, services: [{ title: "Oil change" }] }, { id: "b", photo: "latest-photo" }, { id: "c" }];
  assert.deepEqual(moveVehicle(["a", "b", "c"], "a", "c"), ["b", "c", "a"]);
  assert.deepEqual(moveVehicle(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
  assert.deepEqual(applyVehicleOrder(vehicles, ["b", "c", "a"]), [vehicles[1], vehicles[2], vehicles[0]]);
  assert.deepEqual(vehicles.map(vehicle => vehicle.id), ["a", "b", "c"]);
});
test("stale, incomplete, duplicate and foreign vehicle orders cannot discard data", () => {
  const vehicles = [{ id: "a" }, { id: "b" }];
  for (const ids of [["a"], ["a", "a"], ["a", "foreign"], ["a", "b", "c"]]) assert.throws(() => applyVehicleOrder(vehicles, ids));
  assert.throws(() => moveVehicle(["a", "b"], "missing", "b"));
});
