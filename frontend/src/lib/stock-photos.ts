import type { Vehicle } from "./vehicles";

export type StockPhoto = {
  make: string;
  model: string;
  firstYear: number;
  lastYear: number;
  src: string;
  caption: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
};

const photos: StockPhoto[] = [
  {
    make: "toyota", model: "camry", firstYear: 2018, lastYear: 2024,
    src: "/vehicles/toyota-camry-2018-cutout.png", caption: "2018 Camry SE example",
    author: "Kevauto", source: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Camry_SE_front_3.16.18.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    make: "honda", model: "civic", firstYear: 2016, lastYear: 2021,
    src: "/vehicles/honda-civic-2020-cutout.png", caption: "2020 Civic Si sedan example",
    author: "Bull-Doser", source: "https://commons.wikimedia.org/wiki/File:2020_Honda_Civic_sedan_au_SIAM_2020.jpg",
    license: "Public domain", licenseUrl: "https://commons.wikimedia.org/wiki/File:2020_Honda_Civic_sedan_au_SIAM_2020.jpg#Licensing",
  },
  {
    make: "ford", model: "mustang", firstYear: 2015, lastYear: 2023,
    src: "/vehicles/ford-mustang-2018-cutout.png", caption: "2018 Mustang GT coupe example",
    author: "Vogue2Voke", source: "https://commons.wikimedia.org/wiki/File:2018_Ford_Mustang_5.0_coupe.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

export function stockPhotoFor(vehicle: Pick<Vehicle, "make" | "model" | "year">): StockPhoto | undefined {
  return photos.find(photo => photo.make === vehicle.make.trim().toLowerCase() &&
    photo.model === vehicle.model.trim().toLowerCase() &&
    vehicle.year >= photo.firstYear && vehicle.year <= photo.lastYear);
}
