"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { isVehicle, readVehicles, removeSavedVehicle, updateSavedPhoto, type Vehicle } from "@/lib/vehicles";
import { mutateGarage, useGarage } from "@/lib/garage-store";
import { importBrowserGarage } from "@/lib/garage-api";
import VehicleFields from "./vehicle-fields";
import VehicleImage from "./vehicle-image";
import PhotoInput from "./photo-input";
import AccountLink from "./account-link";
import GarageOrder from "./garage-order";

const numberFormat = new Intl.NumberFormat("en-US");

function Car({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 240 100" fill="none" aria-hidden="true">
    <path d="M28 66 42 49l28-5 25-24h62l29 26 23 7 9 13v15h-17m-34 0H77m-34 0H25V67l3-1Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m78 43 20-17h24v17H78Zm52-17h25l19 17h-44V26ZM34 60h24m134 0h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="60" cy="78" r="17" stroke="currentColor" strokeWidth="3" /><circle cx="60" cy="78" r="7" stroke="currentColor" strokeWidth="2" />
    <circle cx="184" cy="78" r="17" stroke="currentColor" strokeWidth="3" /><circle cx="184" cy="78" r="7" stroke="currentColor" strokeWidth="2" />
  </svg>;
}

export default function Garage() {
  const saved = useGarage();
  const ready = saved.ready;
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
  const vehicleTrack = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const currentSlide = Math.min(slide, Math.max(0, saved.vehicles.length - 1));

  function moveSlide(direction: number) {
    const track = vehicleTrack.current;
    if (!track) return;
    const next = Math.max(0, Math.min(saved.vehicles.length - 1, currentSlide + direction));
    const card = track.children[next] as HTMLElement | undefined;
    if (card) track.scrollTo({ left: card.offsetLeft - (track.firstElementChild as HTMLElement).offsetLeft });
  }

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

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoTarget || photoBusy) return;
    try {
      await mutateGarage(raw => updateSavedPhoto(raw, photoTarget.id, draftPhoto));
      setMessage(`Photo updated for ${photoTarget.year} ${photoTarget.make} ${photoTarget.model}.`);
      photoDialog.current?.close();
    } catch (cause) {
      setPhotoError(saved.account
        ? `${cause instanceof Error ? cause.message : "We couldn't save your account photo. Please try again."} Your saved garage has been kept.`
        : "We couldn't save your photo. Browser storage may be full, or this vehicle may have been removed in another tab. Your saved garage has been kept.");
    }
  }

  function confirmRemoval(vehicle: Vehicle) {
    setRemoving(vehicle);
    setRemoveError("");
    removeDialog.current?.showModal();
  }

  async function removeVehicle() {
    if (!removing) return;
    try {
      // Preserve vehicles added in another tab since confirmation opened.
      await mutateGarage(raw => removeSavedVehicle(raw, removing.id));
      setMessage(`${removing.year} ${removing.make} ${removing.model} removed from your garage.`);
      removeDialog.current?.close();
      addButton.current?.focus();
    } catch {
      setRemoveError("We couldn't remove this vehicle. Your saved garage has been kept. Please try again.");
    }
  }

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
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
      await mutateGarage(raw => [...readVehicles(raw), vehicle]);
      form.reset();
      dialog.current?.close();
      setMessage(`${vehicle.year} ${vehicle.make} ${vehicle.model} added to your garage.`);
    } catch {
      setFormError("We couldn't save this vehicle. Check that browser storage is available, then try again. Your existing garage has been kept.");
    }
  }

  async function importGarage() {
    try {
      const count = await importBrowserGarage();
      setMessage(count === 0 ? "Your browser vehicles are already in your account." : `${count} ${count === 1 ? "vehicle imported" : "vehicles imported"}. Existing account vehicles were kept.`);
    } catch { setMessage("Import couldn't finish. Check the backend and retry. Already imported vehicles stay saved; your browser garage is kept."); }
  }

  return <div className="garage-shell">
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Motorva home"><span className="brand-mark">M</span>MOTORVA<span className="brand-dot">.</span></Link>
      <AccountLink />
    </header>
    <main className="garage-main">
      <section className="intro" aria-labelledby="garage-title">
        <div><p className="eyebrow">BUILT AROUND YOUR DRIVE</p><h1 id="garage-title">Your garage.<br /><span>Your starting line.</span></h1>
          <p className="intro-copy">A home for every vehicle you own. Add your ride and keep the essentials in one place.</p></div>
        <div className="garage-counter"><span className="counter-number">{ready && !saved.error ? String(saved.vehicles.length).padStart(2, "0") : "—"}</span><span>VEHICLES IN YOUR GARAGE</span></div>
      </section>
      <section className="vehicles-section" aria-labelledby="vehicles-title">
        {saved.account && saved.pendingImports > 0 && <div className="account-import"><p>{saved.pendingImports} {saved.pendingImports === 1 ? "vehicle saved only in this browser." : "vehicles saved only in this browser."} Import to keep {saved.pendingImports === 1 ? "it" : "them"} in your account.</p><button className="button-secondary" disabled={saved.saving} onClick={() => void importGarage()}>Import browser garage</button></div>}
        <div className="section-heading"><div><p className="eyebrow">THE LINEUP</p><h2 id="vehicles-title">My vehicles</h2></div>
          <div className="garage-heading-actions">{saved.vehicles.length > 1 && <GarageOrder vehicles={saved.vehicles} disabled={!ready || !!saved.error || saved.saving} onSaved={() => { setMessage("Garage order saved."); setSlide(0); vehicleTrack.current?.scrollTo({ left: 0 }); }} />}<button ref={addButton} className="button-primary" onClick={openForm} disabled={!ready || !!saved.error}><span aria-hidden="true">＋</span> Add vehicle</button></div></div>
        <p className="announcement" role="status">{message}</p>
        {!ready ? <div className="empty-state" role="status">Loading your garage…</div> : saved.error ? <div className="storage-error" role="alert">{saved.error}</div> : saved.vehicles.length === 0 ?
          <div className="empty-state"><div className="empty-car"><Car /></div><p className="eyebrow">EVERY GARAGE STARTS WITH ONE</p><h3>Make room for your first ride.</h3><p>Add your vehicle’s details to get your garage started.</p><button className="button-primary" onClick={openForm}>Add your first vehicle <span aria-hidden="true">↗</span></button></div> :
          <div className="vehicle-carousel">
          {saved.vehicles.length > 1 && <nav className="vehicle-slide-controls" aria-label="Browse garage vehicles">
            <button type="button" onClick={() => moveSlide(-1)} disabled={currentSlide === 0} aria-label="Previous vehicle">←</button>
            <span role="status" aria-live="polite">{currentSlide + 1} / {saved.vehicles.length}</span>
            <button type="button" onClick={() => moveSlide(1)} disabled={currentSlide === saved.vehicles.length - 1} aria-label="Next vehicle">→</button>
          </nav>}
          <div className="vehicle-grid" id="garage-vehicle-track" ref={vehicleTrack} onScroll={() => {
            const track = vehicleTrack.current;
            if (!track || track.scrollWidth <= track.clientWidth) return;
            const first = (track.firstElementChild as HTMLElement).offsetLeft;
            let nearest = 0, distance = Infinity;
            Array.from(track.children).forEach((card, index) => {
              const delta = Math.abs((card as HTMLElement).offsetLeft - first - track.scrollLeft);
              if (delta < distance) { nearest = index; distance = delta; }
            });
            setSlide(nearest);
          }}>{saved.vehicles.map((vehicle, index) => <article className="vehicle-card" key={vehicle.id} aria-label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}>
            <VehicleImage vehicle={vehicle} onEditPhoto={() => openPhoto(vehicle)}><span className="vehicle-index">{String(index + 1).padStart(2, "0")} / MOTORVA GARAGE</span><Car /></VehicleImage>
            <div className="vehicle-details"><p className="eyebrow">{vehicle.make}</p><h3>{vehicle.model}</h3><div className="mileage"><span>ODOMETER</span><strong>{numberFormat.format(vehicle.mileage)} <small>mi</small></strong></div><Link href={`/vehicles/${encodeURIComponent(vehicle.id)}`} className="vehicle-detail-link">View vehicle <span aria-hidden="true">↗</span></Link><div className="vehicle-actions"><button className="remove-link" aria-label={`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClick={() => confirmRemoval(vehicle)}>Remove vehicle</button></div></div>
          </article>)}</div></div>}
      </section>
      <footer className="garage-footer"><span>YOUR VEHICLES. YOUR JOURNEY.</span><p>{saved.account ? "Saved to your Motorva account." : <>Saved in this browser. <Link href="/account">Create a free account</Link> to keep your garage across devices.</>}</p></footer>
    </main>
    <dialog ref={dialog} className="vehicle-dialog" aria-labelledby="form-title" onClose={() => { setFormError(""); setFormOpen(false); setDraftPhoto(undefined); setPhotoBusy(false); }}>
      <div className="dialog-heading"><div><p className="eyebrow">EXPAND YOUR LINEUP</p><h2 id="form-title">Add a vehicle</h2></div><button className="close-button" aria-label="Close add vehicle form" onClick={() => { dialog.current?.close(); dialog.current?.querySelector("form")?.reset(); }}>×</button></div>
      <p className="form-intro">Start with the essentials. You can add another vehicle anytime.</p>
      <form onSubmit={addVehicle}>
        {formOpen && <VehicleFields />}
        {formOpen && <PhotoInput value={draftPhoto} onChange={setDraftPhoto} onBusyChange={setPhotoBusy} />}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <p className="save-note">{saved.account ? "Saved to your account garage." : "Saved to your garage in this browser."}</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => { dialog.current?.close(); dialog.current?.querySelector("form")?.reset(); }}>Cancel</button><button type="submit" className="button-primary" disabled={photoBusy || saved.saving}>Save vehicle <span aria-hidden="true">↗</span></button></div>
      </form>
    </dialog>
    <dialog ref={photoDialog} className="vehicle-dialog" aria-labelledby="photo-title" onClose={() => { setPhotoTarget(null); setDraftPhoto(undefined); setPhotoError(""); setPhotoBusy(false); }}>
      <p className="eyebrow">MAKE IT YOURS</p><h2 id="photo-title">Your vehicle photo</h2>
      <p className="form-intro">{photoTarget && `${photoTarget.year} ${photoTarget.make} ${photoTarget.model}`}</p>
      <form onSubmit={savePhoto}>
        {photoTarget && <PhotoInput value={draftPhoto} onChange={setDraftPhoto} onBusyChange={setPhotoBusy} />}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        <p className="save-note">Your photo is resized for the card and saved with your vehicle.</p>
        <div className="form-actions"><button type="button" className="button-secondary" onClick={() => photoDialog.current?.close()}>Cancel</button><button type="submit" className="button-primary" disabled={photoBusy || saved.saving}>Save photo</button></div>
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
