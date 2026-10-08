import assert from "node:assert/strict";
import test from "node:test";
import { stockPhotoFor } from "./stock-photos.ts";

test("matches exact make/model names within the supported generation", () => {
  const photo = stockPhotoFor({ make: " TOYOTA ", model: "Camry", year: 2024 });
  assert.equal(photo.src, "/vehicles/toyota-camry-2018-cutout.png");
  assert.ok(photo.caption.includes("2018"));
  assert.ok(photo.author && photo.source && photo.licenseUrl);
  assert.ok(stockPhotoFor({ make: "Honda", model: "Civic", year: 2020 }));
  assert.ok(stockPhotoFor({ make: "Ford", model: "Mustang", year: 2018 }));
});

test("does not substitute another generation or a similar model name", () => {
  for (const vehicle of [
    { make: "Toyota", model: "Camry", year: 2017 }, { make: "Toyota", model: "Camry", year: 2025 },
    { make: "Honda", model: "Civic", year: 2022 }, { make: "Ford", model: "Mustang", year: 2024 },
    { make: "Ford", model: "Mustang Mach-E", year: 2021 }, { make: "Honda", model: "Civic Type R", year: 2020 },
    { make: "Toyota", model: "Corolla", year: 2024 },
  ]) assert.equal(stockPhotoFor(vehicle), undefined);
});
