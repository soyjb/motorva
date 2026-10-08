import assert from "node:assert/strict";
import test from "node:test";
import { catalogOptions } from "./vehicle-catalog.ts";

test("normalizes, deduplicates and sorts directory options", () => {
  assert.deepEqual(catalogOptions({ Results: [
    { MakeId: 448, MakeName: " TOYOTA " }, { MakeId: 474, MakeName: "Honda" },
    { MakeId: 448, MakeName: "TOYOTA" },
  ] }, "make"), [{ id: 474, name: "Honda" }, { id: 448, name: "TOYOTA" }]);
  assert.deepEqual(catalogOptions({ Results: [{ Model_ID: 1, Model_Name: "Camry" }] }, "model"),
    [{ id: 1, name: "Camry" }]);
  assert.deepEqual(catalogOptions({ Results: [] }, "model"), []);
});

test("rejects unexpected API payloads and invalid rows", () => {
  for (const data of [null, {}, { Results: {} }, { Results: [null] },
    { Results: [{ Model_ID: 0, Model_Name: "Camry" }] },
    { Results: [{ Model_ID: 1, Model_Name: " " }] }]) {
    assert.throws(() => catalogOptions(data, "model"));
  }
});
