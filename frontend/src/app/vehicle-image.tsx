"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { stockPhotoFor } from "@/lib/stock-photos";
import type { Vehicle } from "@/lib/vehicles";

export default function VehicleImage({ vehicle, children }: { vehicle: Vehicle; children: ReactNode }) {
  const stock = stockPhotoFor(vehicle);
  const src = vehicle.photo ?? stock?.src;
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const showImage = src && src !== failedSource;
  return <>
    <div className={`vehicle-visual ${showImage ? "has-photo" : ""}`}>
      {showImage ? <Image src={src} alt={vehicle.photo ? `Your photo of ${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Stock example: ${stock?.caption}`} fill sizes="(max-width: 600px) 88vw, (max-width: 900px) 44vw, 360px" unoptimized={!!vehicle.photo} onError={() => setFailedSource(src)} /> : children}
      <span className="vehicle-year">{vehicle.year}</span>
      {showImage && <span className="photo-badge">{vehicle.photo ? "YOUR PHOTO" : "STOCK EXAMPLE"}</span>}
    </div>
    {showImage && !vehicle.photo && stock && <div className="photo-credit">
      <span>{stock.caption}. Year, trim, body style, and color may differ.</span>
      <span>Photo: <a href={stock.source} target="_blank" rel="noreferrer">{stock.author}</a> · <a href={stock.licenseUrl} target="_blank" rel="noreferrer">{stock.license}</a> · resized</span>
    </div>}
  </>;
}
