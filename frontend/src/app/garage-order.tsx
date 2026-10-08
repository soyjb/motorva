"use client";

import { useRef, useState } from "react";
import type { Vehicle } from "@/lib/vehicles";
import { moveVehicle } from "@/lib/vehicle-order";
import { saveGarageOrder } from "@/lib/garage-api";

export default function GarageOrder({ vehicles, disabled, onSaved }: { vehicles: Vehicle[]; disabled: boolean; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const touchTarget = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  function move(source: string, destination: string) {
    if (busy || source === destination) return;
    setIds(current => moveVehicle(current, source, destination));
    const vehicle = vehicles.find(vehicle => vehicle.id === source);
    setAnnouncement(`${vehicle?.make} ${vehicle?.model} moved. Save order to keep this arrangement.`);
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try { await saveGarageOrder(ids); dialog.current?.close(); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save the order. Please try again."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" className="button-secondary" disabled={disabled} onClick={() => {
      setIds(vehicles.map(vehicle => vehicle.id)); setError(""); setAnnouncement(""); dialog.current?.showModal();
    }}>Reorder cars</button>
    <dialog ref={dialog} className="vehicle-dialog order-dialog" aria-labelledby="order-title" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => { setDragging(null); setTarget(null); }}>
      <p className="eyebrow">YOUR GARAGE, YOUR ORDER</p><h2 id="order-title">Arrange your cars</h2>
      <p className="form-intro">Drag the grip to arrange your cars, or use the move buttons.</p>
      <ol className="garage-order-list">
        {ids.map((id, index) => {
          const vehicle = vehicles.find(vehicle => vehicle.id === id);
          return <li key={id} data-order-id={id} className={`garage-order-row ${target === id && dragging !== id ? "drop-target" : ""} ${dragging === id ? "dragging" : ""}`}>
            <button type="button" className="order-grip" disabled={busy} aria-label={`Drag ${vehicle?.make} ${vehicle?.model} to reorder`} onPointerDown={event => {
              if (busy || event.button !== 0 || !event.isPrimary) return;
              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId); touchTarget.current = id; setDragging(id);
            }} onPointerMove={event => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-order-id]");
              touchTarget.current = row?.dataset.orderId ?? null; setTarget(touchTarget.current);
            }} onPointerUp={event => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const destination = touchTarget.current;
              event.currentTarget.releasePointerCapture(event.pointerId);
              if (destination) move(id, destination);
              touchTarget.current = null; setDragging(null); setTarget(null);
            }} onPointerCancel={() => { touchTarget.current = null; setDragging(null); setTarget(null); }} onLostPointerCapture={() => { touchTarget.current = null; setDragging(null); setTarget(null); }}>⠿</button>
            <span className="order-number">{index + 1}</span><span className="order-name">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle removed — reload your garage"}</span>
            <div className="order-move-buttons"><button type="button" disabled={busy || index === 0} aria-label={`Move ${vehicle?.make} ${vehicle?.model} earlier`} onClick={() => move(id, ids[index - 1])}>↑</button><button type="button" disabled={busy || index === ids.length - 1} aria-label={`Move ${vehicle?.make} ${vehicle?.model} later`} onClick={() => move(id, ids[index + 1])}>↓</button></div>
          </li>;
        })}
      </ol>
      <p className="announcement" role="status">{announcement}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button-secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button className="button-primary" disabled={busy || ids.length < 2} onClick={() => void save()}>{busy ? "Saving…" : "Save order"}</button></div>
    </dialog>
  </>;
}
