"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { CHANGE_EVENT, useGarage } from "@/lib/garage-store";
import { MAX_YEAR, STORAGE_KEY, updateSavedDetails, type Vehicle } from "@/lib/vehicles";
import VehicleImage from "./vehicle-image";
import ServiceHistory from "./service-history";

const numberFormat = new Intl.NumberFormat("en-US");

export default function VehicleDetail({ id }: { id: string }) {
  const { vehicles, ready, error } = useGarage();
  const vehicle = vehicles.find(item => item.id === id);
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  function openEditor() {
    if (!vehicle) return;
    setEditing(vehicle);
    setFormError("");
    dialog.current?.showModal();
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const details = { year: Number(data.get("year")), make: String(data.get("make") ?? ""), model: String(data.get("model") ?? ""), mileage: Number(data.get("mileage")) };
    try {
      const latest = updateSavedDetails(window.localStorage.getItem(STORAGE_KEY), id, details);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      dialog.current?.close();
      setMessage("Vehicle details saved.");
    } catch {
      setFormError("We couldn't save your changes. Check the details and available browser storage. The vehicle may have been removed in another tab. Your saved garage has been kept.");
    }
  }

  return <div className="garage-shell">
    <header className="topbar"><Link href="/" className="brand" aria-label="Motorva home"><span className="brand-mark">M</span>MOTORVA<span className="brand-dot">.</span></Link><span className="topbar-label">YOUR DIGITAL GARAGE</span></header>
    <main className="garage-main">
      <Link href="/" className="back-link">← Back to garage</Link>
      {!ready ? <div className="empty-state" role="status">Loading your vehicle…</div> : error ? <div className="storage-error" role="alert">{error}</div> : !vehicle ? <section className="empty-state"><p className="eyebrow">VEHICLE UNAVAILABLE</p><h1>Vehicle not found</h1><p>This vehicle is unavailable in the garage saved in this browser. It may have been removed or saved on another device.</p><Link href="/" className="button-primary">Return to garage</Link></section> : <>
        <section className="detail-heading"><div><p className="eyebrow">YOUR VEHICLE</p><h1>{vehicle.year} {vehicle.make}<br /><span>{vehicle.model}</span></h1></div><button className="button-primary" onClick={openEditor}>Edit vehicle</button></section>
        <p className="announcement" role="status">{message}</p>
        <section className="detail-grid" aria-label="Vehicle overview">
          <div className="vehicle-card detail-photo"><VehicleImage vehicle={vehicle}><span className="detail-placeholder">{vehicle.make} {vehicle.model}</span></VehicleImage></div>
          <div className="detail-summary"><p className="eyebrow">THE ESSENTIALS</p><h2>Vehicle overview</h2><dl><div><dt>Year</dt><dd>{vehicle.year}</dd></div><div><dt>Make</dt><dd>{vehicle.make}</dd></div><div><dt>Model</dt><dd>{vehicle.model}</dd></div><div><dt>Odometer</dt><dd>{numberFormat.format(vehicle.mileage)} <small>mi</small></dd></div></dl><button className="button-secondary" onClick={openEditor}>Update mileage</button></div>
        </section>
        <ServiceHistory vehicle={vehicle} />
        <footer className="garage-footer"><span>YOUR VEHICLES. YOUR JOURNEY.</span><p>Saved in this browser. Available here when you return.</p></footer>
      </>}
    </main>
    <dialog ref={dialog} className="vehicle-dialog" aria-labelledby="edit-title" onClose={() => { setEditing(null); setFormError(""); }}>
      <div className="dialog-heading"><div><p className="eyebrow">KEEP IT CURRENT</p><h2 id="edit-title">Edit vehicle</h2></div><button className="close-button" aria-label="Close edit vehicle form" onClick={() => dialog.current?.close()}>×</button></div>
      <p className="form-intro">Update your vehicle details or correct your odometer reading.</p>
      {editing && <form onSubmit={save}><div className="form-grid">
        <label>Year<input name="year" type="number" min="1886" max={MAX_YEAR} step="1" defaultValue={editing.year} required /></label>
        <label>Make<input name="make" maxLength={60} defaultValue={editing.make} required /></label>
        <label className="full-width">Model<input name="model" maxLength={80} defaultValue={editing.model} required /></label>
        <label className="full-width">Mileage (miles)<input name="mileage" type="number" min="0" max="9999999" step="1" defaultValue={editing.mileage} required /><span className="field-hint">Your current odometer reading. You can correct an earlier entry.</span></label>
      </div>{formError && <p className="form-error" role="alert">{formError}</p>}<p className="save-note">Your vehicle photo stays with this vehicle.</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button className="button-primary" type="submit">Save changes</button></div></form>}
    </dialog>
  </div>;
}
