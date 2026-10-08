"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { MAX_PHOTO_LENGTH } from "@/lib/vehicles";

export default function PhotoInput({ value, onChange, onBusyChange }: {
  value?: string;
  onChange: (photo?: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState<string | undefined>(value);
  const [status, setStatus] = useState("");
  const [removing, setRemoving] = useState(false);
  const removal = useRef<AbortController | null>(null);
  useEffect(() => () => { selection.current += 1; removal.current?.abort(); }, []);

  async function removeBackground() {
    if (!value || busy) return;
    const current = ++selection.current;
    const controller = new AbortController();
    removal.current = controller;
    setOriginal(value); setError(""); setBusy(true); setRemoving(true); onBusyChange(true);
    setStatus("Loading background remover… First use may take a moment.");
    try {
      const { removePhotoBackground } = await import("@/lib/background-removal");
      const blob = await removePhotoBackground(value, controller.signal, message => {
        if (current === selection.current) setStatus(message);
      });
      if (controller.signal.aborted || current !== selection.current) return;
      await preparePhoto(blob, current, false);
    } catch (cause) {
      if (current === selection.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Couldn't remove the background. Your original photo is kept.");
    } finally {
      if (current === selection.current) { setBusy(false); setRemoving(false); onBusyChange(false); setStatus(""); removal.current = null; }
    }
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const current = ++selection.current;
    setError("");
    setBusy(true); onBusyChange(true);
    setStatus("Preparing your photo…");
    await preparePhoto(file, current, true);
    if (current === selection.current) { setBusy(false); onBusyChange(false); setStatus(""); }
  }

  async function preparePhoto(file: Blob, current: number, keepOriginal: boolean) {
    let bitmap: ImageBitmap | undefined;
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP photo.");
      }
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a photo smaller than 10 MB.");
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / bitmap.width, 800 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser couldn't process the photo. Try a different browser.");
      const preserveAlpha = file.type === "image/png" || file.type === "image/webp";
      if (!preserveAlpha) {
        context.fillStyle = "#191b17";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let photo = "";
      if (preserveAlpha) {
        photo = canvas.toDataURL("image/png");
        while (photo.length > MAX_PHOTO_LENGTH && canvas.width > 240) {
          const smaller = document.createElement("canvas");
          smaller.width = Math.round(canvas.width * 0.8);
          smaller.height = Math.max(1, Math.round(canvas.height * 0.8));
          const smallerContext = smaller.getContext("2d");
          if (!smallerContext) throw new Error("This browser couldn't resize the photo.");
          smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
          canvas.width = smaller.width; canvas.height = smaller.height;
          context.drawImage(smaller, 0, 0);
          photo = canvas.toDataURL("image/png");
        }
      } else for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
        photo = canvas.toDataURL("image/jpeg", quality);
        if (photo.length <= MAX_PHOTO_LENGTH) break;
      }
      if (photo.length > MAX_PHOTO_LENGTH) throw new Error("This photo is too detailed to save here. Try a smaller photo.");
      if (current === selection.current) { onChange(photo); if (keepOriginal) setOriginal(photo); }
    } catch (cause) {
      if (current === selection.current) setError(cause instanceof Error ? cause.message : "We couldn't read that photo. Try another image.");
    } finally {
      bitmap?.close();
    }
  }

  return <div className="photo-field">
    <label htmlFor={inputId}>Vehicle photo <span>(optional)</span></label>
    <input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void choosePhoto(event)} aria-describedby={`${inputId}-hint`} />
    <p id={`${inputId}-hint`} className="field-hint">JPG, PNG, or WebP, up to 10 MB. Transparent backgrounds are preserved.</p>
    {busy && <p role="status" className="catalog-status">{status}</p>}
    {value && <div className="photo-preview"><Image src={value} alt="Selected vehicle photo preview" fill unoptimized sizes="440px" /><button type="button" className="button-secondary photo-clear" disabled={busy} onClick={() => { onChange(undefined); if (input.current) input.current.value = ""; }}>Use default image instead</button></div>}
    {value && <div className="photo-background-actions">
      {removing && busy ? <button type="button" className="text-button" onClick={() => {
        selection.current += 1; removal.current?.abort(); removal.current = null;
        setBusy(false); setRemoving(false); onBusyChange(false); setStatus("");
      }}>Cancel background removal</button> : original && value !== original ? <button type="button" className="text-button" disabled={busy} onClick={() => { onChange(original); setError(""); }}>Restore original</button> : <button type="button" className="text-button" disabled={busy} onClick={() => void removeBackground()}>Remove background</button>}
      <span>Optional · processed on your device. Preview before saving.</span>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
