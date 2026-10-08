"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { isVehicle, readVehicles, removeSavedVehicle, updateSavedPhoto, STORAGE_KEY, type Vehicle } from "@/lib/vehicles";
import VehicleFields from "./vehicle-fields";
import VehicleImage from "./vehicle-image";
import PhotoInput from "./photo-input";

const CHANGE_EVENT = "motorva:garage-change";
const UNAVAILABLE = "storage-unavailable";
const numberFormat = new Intl.NumberFormat("en-US");

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function snapshot() {
  try { return window.localStorage.getItem(STORAGE_KEY); }
  catch { return UNAVAILABLE; }
}

const serverSnapshot = () => null;
const clientReady = () => true;
const serverReady = () => false;

function Car({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 240 100" fill="none" aria-hidden="true">
    <path d="M28 66 42 49l28-5 25-24h62l29 26 23 7 9 13v15h-17m-34 0H77m-34 0H25V67l3-1Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m78 43 20-17h24v17H78Zm52-17h25l19 17h-44V26ZM34 60h24m134 0h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="60" cy="78" r="17" stroke="currentColor" strokeWidth="3" /><circle cx="60" cy="78" r="7" stroke="currentColor" strokeWidth="2" />
    <circle cx="184" cy="78" r="17" stroke="currentColor" strokeWidth="3" /><circle cx="184" cy="78" r="7" stroke="currentColor" strokeWidth="2" />
  </svg>;
}

export default function Garage() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const saved = useMemo(() => {
    try { return { vehicles: readVehicles(raw), error: "" }; }
    catch { return { vehicles: [] as Vehicle[], error: raw === UNAVAILABLE
      ? "Browser storage is unavailable. Allow site storage and reload to use your garage."
      : "Your saved garage could not be read. It has been kept unchanged. Please restore your browser data before adding vehicles." }; }
  }, [raw]);
  const dialog = useRef<HTMLDialogElement>(null);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const [removing, setRemoving] = useState<Vehicle | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<Vehicle | null>(null);
  const [draftPhoto, setDraftPhoto] = useState<string | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  function openForm() {
    setFormError("");
    setDraftPhoto(undefined); setPhotoBusy(false);
    setFormOpen(true);
    dialog.current?.showModal();
  }

  function openPhoto(vehicle: Vehicle) {
    setPhotoTarget(vehicle);
    setDraftPhoto(vehicle.photo);
    setPhotoError(""); setPhotoBusy(false);
    photoDialog.current?.showModal();
  }

  function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoTarget || photoBusy) return;
    try {
      const latest = updateSavedPhoto(window.localStorage.getItem(STORAGE_KEY), photoTarget.id, draftPhoto);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setMessage(`Photo updated for ${photoTarget.year} ${photoTarget.make} ${photoTarget.model}.`);
      photoDialog.current?.close();
    } catch {
      setPhotoError("We couldn't save your photo. Browser storage may be full, or this vehicle may have been removed in another tab. Your saved garage has been kept.");
    }
  }

  function confirmRemoval(vehicle: Vehicle) {
    setRemoving(vehicle);
    setRemoveError("");
    removeDialog.current?.showModal();
  }

  function removeVehicle() {
    if (!removing) return;
    try {
      // Preserve vehicles added in another tab since confirmation opened.
      const remaining = removeSavedVehicle(window.localStorage.getItem(STORAGE_KEY), removing.id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setMessage(`${removing.year} ${removing.make} ${removing.model} removed from your garage.`);
      removeDialog.current?.close();
      addButton.current?.focus();
    } catch {
      setRemoveError("We couldn't remove this vehicle. Your saved garage has been kept. Please try again.");
    }
  }

  function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const vehicle: Vehicle = {
      id: crypto.randomUUID(),
      year: Number(data.get("year")),
      make: String(data.get("make") ?? "").trim(),
      model: String(data.get("model") ?? "").trim(),
      mileage: Number(data.get("mileage")),
      ...(draftPhoto ? { photo: draftPhoto } : {}),
    };
    if (!isVehicle(vehicle)) {
      setFormError("Enter a valid year, make, model, and whole-number mileage.");
      return;
    }
    try {
      // Read at submission time so another tab's additions are retained.
      const latest = readVehicles(window.localStorage.getItem(STORAGE_KEY));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...latest, vehicle]));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      form.reset();
      dialog.current?.close();
      setMessage(`${vehicle.year} ${vehicle.make} ${vehicle.model} added to your garage.`);
    } catch {
      setFormError("We couldn't save this vehicle. Check that browser storage is available, then try again. Your existing garage has been kept.");
    }
  }

  return <div className="garage-shell">
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Motorva home"><span className="brand-mark">M</span>MOTORVA<span className="brand-dot">.</span></Link>
      <span className="topbar-label"><span className="status-dot" /> YOUR DIGITAL GARAGE</span>
    </header>
    <main className="garage-main">
      <section className="intro" aria-labelledby="garage-title">
        <div><p className="eyebrow">BUILT AROUND YOUR DRIVE</p><h1 id="garage-title">Your garage.<br /><span>Your starting line.</span></h1>
          <p className="intro-copy">A home for every vehicle you own. Add your ride and keep the essentials in one place.</p></div>
        <div className="garage-counter"><span className="counter-number">{ready && !saved.error ? String(saved.vehicles.length).padStart(2, "0") : "—"}</span><span>VEHICLES IN YOUR GARAGE</span></div>
      </section>
      <section className="vehicles-section" aria-labelledby="vehicles-title">
        <div className="section-heading"><div><p className="eyebrow">THE LINEUP</p><h2 id="vehicles-title">My vehicles</h2></div>
          <button ref={addButton} className="button-primary" onClick={openForm} disabled={!ready || !!saved.error}><span aria-hidden="true">＋</span> Add vehicle</button></div>
        <p className="announcement" role="status">{message}</p>
        {!ready ? <div className="empty-state" role="status">Loading your garage…</div> : saved.error ? <div className="storage-error" role="alert">{saved.error}</div> : saved.vehicles.length === 0 ?
          <div className="empty-state"><div className="empty-car"><Car /></div><p className="eyebrow">EVERY GARAGE STARTS WITH ONE</p><h3>Make room for your first ride.</h3><p>Add your vehicle’s details to get your garage started.</p><button className="button-primary" onClick={openForm}>Add your first vehicle <span aria-hidden="true">↗</span></button></div> :
          <div className="vehicle-grid">{saved.vehicles.map((vehicle, index) => <article className="vehicle-card" key={vehicle.id} aria-label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}>
            <VehicleImage vehicle={vehicle}><span className="vehicle-index">{String(index + 1).padStart(2, "0")} / MOTORVA GARAGE</span><Car /></VehicleImage>
            <div className="vehicle-details"><p className="eyebrow">{vehicle.make}</p><h3>{vehicle.model}</h3><div className="mileage"><span>ODOMETER</span><strong>{numberFormat.format(vehicle.mileage)} <small>mi</small></strong></div><div className="vehicle-actions"><button className="text-button" aria-label={`${vehicle.photo ? "Change" : "Add"} photo for ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClick={() => openPhoto(vehicle)}>{vehicle.photo ? "Change photo" : "Add your photo"}</button><button className="remove-link" aria-label={`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClick={() => confirmRemoval(vehicle)}>Remove vehicle</button></div></div>
          </article>)}</div>}
      </section>
      <footer className="garage-footer"><span>YOUR VEHICLES. YOUR JOURNEY.</span><p>Saved in this browser. Available here when you return.</p></footer>
    </main>
    <dialog ref={dialog} className="vehicle-dialog" aria-labelledby="form-title" onClose={() => { setFormError(""); setFormOpen(false); setDraftPhoto(undefined); setPhotoBusy(false); }}>
      <div className="dialog-heading"><div><p className="eyebrow">EXPAND YOUR LINEUP</p><h2 id="form-title">Add a vehicle</h2></div><button className="close-button" aria-label="Close add vehicle form" onClick={() => { dialog.current?.close(); dialog.current?.querySelector("form")?.reset(); }}>×</button></div>
      <p className="form-intro">Start with the essentials. You can add another vehicle anytime.</p>
      <form onSubmit={addVehicle}>
        {formOpen && <VehicleFields />}
        {formOpen && <PhotoInput value={draftPhoto} onChange={setDraftPhoto} onBusyChange={setPhotoBusy} />}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <p className="save-note">Saved to your garage in this browser.</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => { dialog.current?.close(); dialog.current?.querySelector("form")?.reset(); }}>Cancel</button><button type="submit" className="button-primary" disabled={photoBusy}>Save vehicle <span aria-hidden="true">↗</span></button></div>
      </form>
    </dialog>
    <dialog ref={photoDialog} className="vehicle-dialog" aria-labelledby="photo-title" onClose={() => { setPhotoTarget(null); setDraftPhoto(undefined); setPhotoError(""); setPhotoBusy(false); }}>
      <p className="eyebrow">MAKE IT YOURS</p><h2 id="photo-title">Your vehicle photo</h2>
      <p className="form-intro">{photoTarget && `${photoTarget.year} ${photoTarget.make} ${photoTarget.model}`}</p>
      <form onSubmit={savePhoto}>
        {photoTarget && <PhotoInput value={draftPhoto} onChange={setDraftPhoto} onBusyChange={setPhotoBusy} />}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        <p className="save-note">Your photo is resized for the card and saved only in this browser.</p>
        <div className="form-actions"><button type="button" className="button-secondary" onClick={() => photoDialog.current?.close()}>Cancel</button><button type="submit" className="button-primary" disabled={photoBusy}>Save photo</button></div>
      </form>
    </dialog>
    <dialog ref={removeDialog} className="vehicle-dialog" aria-labelledby="remove-title" aria-describedby="remove-description" onClose={() => { setRemoving(null); setRemoveError(""); }}>
      <p className="eyebrow">MANAGE YOUR LINEUP</p>
      <h2 id="remove-title">Remove this vehicle?</h2>
      <p id="remove-description" className="form-intro">{removing && <strong>{removing.year} {removing.make} {removing.model}</strong>} will be removed from your saved garage in this browser. To add it again, you’ll need to enter its details.</p>
      {removeError && <p className="form-error" role="alert">{removeError}</p>}
      <div className="form-actions"><button className="button-secondary" onClick={() => removeDialog.current?.close()}>Keep vehicle</button><button className="button-danger" onClick={removeVehicle}>Remove vehicle</button></div>
    </dialog>
  </div>;
}
