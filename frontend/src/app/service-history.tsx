"use client";

import { useRef, useState, type FormEvent } from "react";
import { mutateGarage, useGarage } from "@/lib/garage-store";
import { localDateToday, parseServiceCost, removeServiceRecord, saveServiceRecord, type ServiceRecord, type Vehicle } from "@/lib/vehicles";

const numbers = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dates = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function ServiceHistory({ vehicle }: { vehicle: Vehicle }) {
  const { saving, account } = useGarage();
  const dialog = useRef<HTMLDialogElement>(null);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [removing, setRemoving] = useState<ServiceRecord | null>(null);
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [message, setMessage] = useState("");
  const services = [...(vehicle.services ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage);
  const total = services.reduce((sum, record) => sum + (record.costCents ?? 0), 0);

  function edit(record: ServiceRecord | null) {
    setEditing(record); setError(""); setOpen(true);
    dialog.current?.showModal();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const costCents = parseServiceCost(String(data.get("cost") ?? ""));
      const record: ServiceRecord = {
        id: editing?.id ?? crypto.randomUUID(), title: String(data.get("title") ?? ""),
        date: String(data.get("date") ?? ""), mileage: Number(data.get("mileage")),
        notes: String(data.get("notes") ?? ""), ...(costCents === undefined ? {} : { costCents }),
      };
      await mutateGarage(raw => saveServiceRecord(raw, vehicle.id, record, !!editing));
      dialog.current?.close();
      setMessage(editing ? "Service record updated." : "Service record added.");
    } catch {
      setError("We couldn't save this service. Check the date, mileage, and cost. Browser storage may be full, or the vehicle or record may have been removed. Your saved history has been kept.");
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await mutateGarage(raw => removeServiceRecord(raw, vehicle.id, removing.id));
      removeDialog.current?.close(); setMessage("Service record removed.");
    } catch { setRemoveError("We couldn't remove this record. Your saved history has been kept. Please try again."); }
  }

  return <section className="service-section" aria-labelledby="service-title">
    <div className="section-heading"><div><p className="eyebrow">KEEP A RECORD</p><h2 id="service-title">Service history</h2></div><button className="button-primary" onClick={() => edit(null)}>Add service</button></div>
    <p className="announcement" role="status">{message}</p>
    {services.length === 0 ? <div className="empty-state service-empty"><h3>Your maintenance story starts here.</h3><p>Record an oil change, tire rotation, repair, or other completed service.</p></div> : <>
      <p className="service-total">{services.length} {services.length === 1 ? "record" : "records"} · Recorded costs <strong>{money.format(total / 100)}</strong></p>
      <div className="service-list">{services.map(record => <article className="service-record" key={record.id}>
        <div className="service-record-heading"><div><time dateTime={record.date}>{dates.format(new Date(record.date))}</time><h3>{record.title}</h3></div><strong>{record.costCents === undefined ? "Cost not recorded" : money.format(record.costCents / 100)}</strong></div>
        <p className="service-mileage">{numbers.format(record.mileage)} mi at service</p>
        {record.notes && <p className="service-notes">{record.notes}</p>}
        <div className="vehicle-actions"><button className="text-button" aria-label={`Edit ${record.title} on ${record.date}`} onClick={() => edit(record)}>Edit record</button><button className="remove-link" aria-label={`Remove ${record.title} on ${record.date}`} onClick={() => { setRemoving(record); setRemoveError(""); removeDialog.current?.showModal(); }}>Remove record</button></div>
      </article>)}</div>
    </>}
    <dialog ref={dialog} className="vehicle-dialog" aria-labelledby="service-form-title" onClose={() => { setOpen(false); setEditing(null); setError(""); }}>
      <div className="dialog-heading"><div><p className="eyebrow">MAINTENANCE LOG</p><h2 id="service-form-title">{editing ? "Edit service" : "Add service"}</h2></div><button className="close-button" aria-label="Close service form" onClick={() => dialog.current?.close()}>×</button></div>
      <p className="form-intro">Log completed work. Historical mileage does not change your current odometer.</p>
      {open && <form onSubmit={save}><div className="form-grid">
        <label className="full-width">Service<input name="title" placeholder="Oil and filter change" maxLength={80} required defaultValue={editing?.title ?? ""} /></label>
        <label>Date<input name="date" type="date" min="1886-01-01" max={localDateToday()} required defaultValue={editing?.date ?? localDateToday()} /></label>
        <label>Mileage at service<input name="mileage" type="number" min="0" max="9999999" step="1" required defaultValue={editing?.mileage ?? vehicle.mileage} /></label>
        <label className="full-width">Cost (USD, optional)<input name="cost" type="number" min="0" max="999999.99" step="0.01" placeholder="75.00" defaultValue={editing?.costCents === undefined ? "" : (editing.costCents / 100).toFixed(2)} /></label>
        <label className="full-width">Notes (optional)<textarea name="notes" maxLength={2000} rows={4} placeholder="Parts used, work completed, or shop name" defaultValue={editing?.notes ?? ""} /></label>
      </div>{error && <p className="form-error" role="alert">{error}</p>}<p className="save-note">{account ? "Saved with this vehicle in your account." : "Saved with this vehicle in this browser."}</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button className="button-primary" type="submit" disabled={saving}>Save service</button></div></form>}
    </dialog>
    <dialog ref={removeDialog} className="vehicle-dialog" aria-labelledby="remove-service-title" onClose={() => { setRemoving(null); setRemoveError(""); }}>
      <h2 id="remove-service-title">Remove this service record?</h2><p className="form-intro">{removing?.title} will be removed from this vehicle’s history.</p>{removeError && <p className="form-error" role="alert">{removeError}</p>}<div className="form-actions"><button className="button-secondary" onClick={() => removeDialog.current?.close()}>Keep record</button><button className="button-danger" onClick={remove}>Remove record</button></div>
    </dialog>
  </section>;
}
