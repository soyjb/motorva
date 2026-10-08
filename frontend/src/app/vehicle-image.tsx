"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { stockPhotoFor } from "@/lib/stock-photos";
import type { Vehicle } from "@/lib/vehicles";

export default function VehicleImage({ vehicle, children, onEditPhoto }: { vehicle: Vehicle; children: ReactNode; onEditPhoto?: () => void }) {
  const stock = stockPhotoFor(vehicle);
  const src = vehicle.photo ?? stock?.src;
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const showImage = src && src !== failedSource;
  return <>
    <div className={`vehicle-visual ${showImage ? "has-photo" : ""}`}>
      {showImage ? <Image src={src} alt={vehicle.photo ? `Your photo of ${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Stock example: ${stock?.caption}`} fill sizes="(max-width: 600px) 88vw, (max-width: 900px) 44vw, 360px" unoptimized={!!vehicle.photo} onError={() => setFailedSource(src)} /> : children}
      <span className="vehicle-year">{vehicle.year}</span>
      {showImage && <span className="photo-badge">{vehicle.photo ? "YOUR PHOTO" : "STOCK EXAMPLE"}</span>}
      {onEditPhoto && <button type="button" className="photo-edit-button" onClick={onEditPhoto} aria-label={`${vehicle.photo ? "Change" : "Add"} photo for ${vehicle.year} ${vehicle.make} ${vehicle.model}`} title={vehicle.photo ? "Change photo" : "Add photo"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 5 9.5 3h5L16 5h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><circle cx="12" cy="12" r="4" /></svg>
      </button>}
    </div>
    {showImage && !vehicle.photo && stock && <div className="photo-credit">
      <span>{stock.caption}. Year, trim, body style, and color may differ.</span>
      <span>Photo: <a href={stock.source} target="_blank" rel="noreferrer">{stock.author}</a> · <a href={stock.licenseUrl} target="_blank" rel="noreferrer">{stock.license}</a> · background removed with AI</span>
    </div>}
  </>;
}
