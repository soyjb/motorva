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
  useEffect(() => () => { selection.current += 1; }, []);

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const current = ++selection.current;
    setError("");
    setBusy(true); onBusyChange(true);
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
      context.fillStyle = "#191b17";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let photo = "";
      for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
        photo = canvas.toDataURL("image/jpeg", quality);
        if (photo.length <= MAX_PHOTO_LENGTH) break;
      }
      if (photo.length > MAX_PHOTO_LENGTH) throw new Error("This photo is too detailed to save here. Try a smaller photo.");
      if (current === selection.current) onChange(photo);
    } catch (cause) {
      if (current === selection.current) setError(cause instanceof Error ? cause.message : "We couldn't read that photo. Try another image.");
    } finally {
      bitmap?.close();
      if (current === selection.current) { setBusy(false); onBusyChange(false); }
    }
  }

  return <div className="photo-field">
    <label htmlFor={inputId}>Vehicle photo <span>(optional)</span></label>
    <input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void choosePhoto(event)} aria-describedby={`${inputId}-hint`} />
    <p id={`${inputId}-hint`} className="field-hint">JPG, PNG, or WebP, up to 10 MB. Your photo stays in this browser.</p>
    {busy && <p role="status" className="catalog-status">Preparing your photo…</p>}
    {value && <div className="photo-preview"><Image src={value} alt="Selected vehicle photo preview" fill unoptimized sizes="440px" /><button type="button" className="button-secondary photo-clear" disabled={busy} onClick={() => { onChange(undefined); if (input.current) input.current.value = ""; }}>Use default image instead</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
