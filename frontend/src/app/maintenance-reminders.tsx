"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { mutateGarage, useGarage } from "@/lib/garage-store";
import { changeReminder, completeReminderWithService, localDateToday, parseServiceCost, reminderStatus, saveReminder, type MaintenanceReminder, type ServiceRecord, type Vehicle } from "@/lib/vehicles";

const numbers = new Intl.NumberFormat("en-US");
const dates = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const priority = { Overdue: 0, "Due now": 1, "Due soon": 2, Upcoming: 3, Completed: 4 };

export default function MaintenanceReminders({ vehicle }: { vehicle: Vehicle }) {
  const { saving, account } = useGarage();
  const dialog = useRef<HTMLDialogElement>(null);
  const removalDialog = useRef<HTMLDialogElement>(null);
  const completionDialog = useRef<HTMLDialogElement>(null);
  const [completing, setCompleting] = useState<MaintenanceReminder | null>(null);
  const [completionError, setCompletionError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceReminder | null>(null);
  const [removing, setRemoving] = useState<MaintenanceReminder | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [today, setToday] = useState(localDateToday);
  useEffect(() => {
    const refresh = () => setToday(localDateToday());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const reminders = [...(vehicle.reminders ?? [])].sort((a, b) => priority[reminderStatus(a, vehicle.mileage, today)] - priority[reminderStatus(b, vehicle.mileage, today)] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || (a.dueMileage ?? Infinity) - (b.dueMileage ?? Infinity));

  function edit(item: MaintenanceReminder | null) {
    setEditing(item); setError(""); setOpen(true); dialog.current?.showModal();
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date") ?? "");
    const mileage = String(data.get("mileage") ?? "");
    const item: MaintenanceReminder = { id: editing?.id ?? crypto.randomUUID(), title: String(data.get("title") ?? ""),
      ...(date ? { dueDate: date } : {}), ...(mileage ? { dueMileage: Number(mileage) } : {}),
      ...(editing?.completedDate ? { completedDate: editing.completedDate } : {}) };
    try {
      await mutateGarage(raw => saveReminder(raw, vehicle.id, item, !!editing));
      dialog.current?.close(); setMessage("Reminder saved.");
    } catch { setError("Enter a title and at least one valid due date or mileage. If saving still fails, browser storage may be full or the reminder may have been removed. Your saved garage has been kept."); }
  }
  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!completing) return;
    const data = new FormData(event.currentTarget);
    try {
      const costCents = parseServiceCost(String(data.get("cost") ?? ""));
      const record: ServiceRecord = { id: crypto.randomUUID(), title: completing.title,
        date: String(data.get("date") ?? ""), mileage: Number(data.get("mileage")), notes: String(data.get("notes") ?? ""),
        ...(costCents === undefined ? {} : { costCents }) };
      await mutateGarage(raw => completeReminderWithService(raw, vehicle.id, completing.id, record));
      completionDialog.current?.close();
      setMessage("Maintenance completed and added to service history.");
    } catch { setCompletionError("We couldn't complete this maintenance. Check the date, mileage, and cost. Storage may be full, or this reminder may have been removed or completed in another tab. Your saved garage has been kept."); }
  }
  function openCompletion(item: MaintenanceReminder) {
    setCompleting(item); setCompletionError(""); completionDialog.current?.showModal();
  }
  async function act(item: MaintenanceReminder, action: "reopen" | "remove") {
    try {
      await mutateGarage(raw => changeReminder(raw, vehicle.id, item.id, action));
      setActionError("");
      if (action === "remove") removalDialog.current?.close();
      setMessage(action === "reopen" ? "Reminder reopened. Its existing service history stays saved." : "Reminder removed.");
    } catch { setActionError("We couldn't update this reminder. It may have been removed or browser storage may be unavailable. Your saved garage has been kept."); }
  }
  return <section className="service-section" aria-labelledby="reminders-title">
    <div className="section-heading"><div><p className="eyebrow">WHAT’S NEXT</p><h2 id="reminders-title">Maintenance reminders</h2></div><button className="button-primary" onClick={() => edit(null)}>Add reminder</button></div>
    <p className="field-hint catalog-note">Choose your own schedule from your maintenance records or owner’s manual. Due soon means within 30 days or 500 miles. When both are set, whichever comes first applies.</p>
    <p className="announcement" role="status">{message}</p>
    {actionError && !removing && <p className="form-error" role="alert">{actionError}</p>}
    {reminders.length === 0 ? <div className="empty-state service-empty"><h3>Stay ahead of your next service.</h3><p>Add a date, mileage target, or both.</p></div> : <div className="service-list">{reminders.map(item => {
      const status = reminderStatus(item, vehicle.mileage, today);
      return <article className="service-record" key={item.id}><div className="service-record-heading"><h3>{item.title}</h3><span className={`reminder-badge reminder-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span></div>
        <p className="service-mileage">{item.dueDate && <>Due {dates.format(new Date(item.dueDate))}</>}{item.dueDate && item.dueMileage !== undefined && " · "}{item.dueMileage !== undefined && <>Due at {numbers.format(item.dueMileage)} mi</>}</p>
        {item.completedDate && <p className="field-hint">Completed {dates.format(new Date(item.completedDate))}</p>}
        <div className="reminder-actions"><button className="button-secondary" onClick={() => item.completedDate ? act(item, "reopen") : openCompletion(item)}>{item.completedDate ? "Reopen" : "Mark completed"}</button><button className="text-button" aria-label={`Edit reminder ${item.title}`} onClick={() => edit(item)}>Edit</button><button className="remove-link" aria-label={`Remove reminder ${item.title}`} onClick={() => { setRemoving(item); setActionError(""); removalDialog.current?.showModal(); }}>Remove</button></div>
      </article>;
    })}</div>}
    <p className="save-note">Reminders appear here while you use Motorva. Email and phone notifications aren’t connected yet.</p>
    <dialog ref={completionDialog} className="vehicle-dialog" aria-labelledby="complete-title" onClose={() => { setCompleting(null); setCompletionError(""); }}>
      <div className="dialog-heading"><h2 id="complete-title">Complete maintenance</h2><button className="close-button" aria-label="Close maintenance completion form" onClick={() => completionDialog.current?.close()}>×</button></div>
      <p className="form-intro">{completing?.title} will be added to service history. Confirm when the work was done and the mileage at that time.</p>
      {completing && <form onSubmit={complete}><div className="form-grid">
        <label>Date completed<input name="date" type="date" min="1886-01-01" max={localDateToday()} required defaultValue={localDateToday()} /></label>
        <label>Mileage at service<input name="mileage" type="number" min="0" max="9999999" step="1" required defaultValue={vehicle.mileage} /></label>
        <label className="full-width">Cost (USD, optional)<input name="cost" type="number" min="0" max="999999.99" step="0.01" placeholder="75.00" /></label>
        <label className="full-width">Notes (optional)<textarea name="notes" maxLength={2000} rows={4} placeholder="Parts used, work completed, or shop name" /></label>
      </div>{completionError && <p className="form-error" role="alert">{completionError}</p>}<p className="save-note">Saving completes the reminder and records the service together. Your current odometer stays unchanged.</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => completionDialog.current?.close()}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>Save completed service</button></div></form>}
    </dialog>
    <dialog ref={dialog} className="vehicle-dialog" aria-labelledby="reminder-form-title" onClose={() => { setOpen(false); setEditing(null); setError(""); }}>
      <div className="dialog-heading"><h2 id="reminder-form-title">{editing ? "Edit reminder" : "Add reminder"}</h2><button className="close-button" aria-label="Close reminder form" onClick={() => dialog.current?.close()}>×</button></div>
      <p className="form-intro">Set at least one target. You can record an overdue task too.</p>
      {open && <form onSubmit={save}><div className="form-grid"><label className="full-width">Maintenance task<input name="title" maxLength={80} required placeholder="Oil change" defaultValue={editing?.title ?? ""} /></label><label className="full-width">Due date (optional)<input name="date" type="date" min="1886-01-01" defaultValue={editing?.dueDate ?? ""} /></label><label className="full-width">Due mileage (optional)<input name="mileage" type="number" min="0" max="9999999" step="1" placeholder="40000" defaultValue={editing?.dueMileage ?? ""} /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<p className="save-note">{account ? "Saved with this vehicle in your account." : "Saved with this vehicle in this browser."}</p><div className="form-actions"><button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>Save reminder</button></div></form>}
    </dialog>
    <dialog ref={removalDialog} className="vehicle-dialog" aria-labelledby="remove-reminder-title" onClose={() => { setRemoving(null); setActionError(""); }}><h2 id="remove-reminder-title">Remove this reminder?</h2><p className="form-intro">{removing?.title} will be removed from this vehicle.</p>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="form-actions"><button className="button-secondary" onClick={() => removalDialog.current?.close()}>Keep reminder</button><button className="button-danger" onClick={() => removing && act(removing, "remove")}>Remove reminder</button></div></dialog>
  </section>;
}
