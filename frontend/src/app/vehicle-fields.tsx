"use client";

import { useEffect, useRef, useState } from "react";
import { getMakes, getModels, type CatalogOption } from "@/lib/vehicle-catalog";
import { MAX_YEAR } from "@/lib/vehicles";

const years = Array.from({ length: MAX_YEAR - 1995 }, (_, index) => MAX_YEAR - index);

export default function VehicleFields() {
  const [manual, setManual] = useState(false);
  const [year, setYear] = useState("");
  const [makeId, setMakeId] = useState("");
  const [model, setModel] = useState("");
  const [makes, setMakes] = useState<CatalogOption[]>([]);
  const [models, setModels] = useState<CatalogOption[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [makesError, setMakesError] = useState("");
  const [modelsError, setModelsError] = useState("");
  const pendingModels = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    getMakes().then(options => {
      if (active) { setMakes(options); setMakesLoading(false); }
    }).catch(() => {
      if (active) { setMakesLoading(false); setMakesError("The vehicle directory couldn't load. You can enter your vehicle manually."); }
    });
    return () => { active = false; pendingModels.current?.abort(); };
  }, []);

  function changeYear(value: string) {
    pendingModels.current?.abort();
    setYear(value); setMakeId(""); setModel(""); setModels([]);
    setModelsLoading(false); setModelsError("");
  }

  async function changeMake(value: string) {
    pendingModels.current?.abort();
    setMakeId(value); setModel(""); setModels([]); setModelsError("");
    if (!value) { setModelsLoading(false); return; }
    const controller = new AbortController();
    pendingModels.current = controller;
    setModelsLoading(true);
    try {
      const options = await getModels(Number(value), Number(year), controller.signal);
      if (controller.signal.aborted) return;
      setModels(options);
      if (!options.length) setModelsError("No models are listed for this year and make. Try another selection or enter your vehicle manually.");
    } catch {
      if (!controller.signal.aborted) setModelsError("Models couldn't load. Try selecting the make again, or enter your vehicle manually.");
    } finally {
      if (!controller.signal.aborted) setModelsLoading(false);
    }
  }

  function changeMode() {
    pendingModels.current?.abort();
    setManual(!manual); setMakeId(""); setModel(""); setModels([]);
    setModelsLoading(false); setModelsError("");
    if (Number(year) < 1996) setYear("");
  }

  return <>
    <div className="entry-mode"><span>{manual ? "Manual entry" : "Choose from the vehicle directory"}</span>
      <button type="button" className="text-button" onClick={changeMode}>{manual ? "Use vehicle directory" : "Enter manually"}</button></div>
    <div className="form-grid">
      {manual ? <>
        <label>Year<input name="year" type="number" min="1886" max={MAX_YEAR} step="1" placeholder="2024" required value={year} onChange={event => setYear(event.target.value)} /></label>
        <label>Make<input name="make" maxLength={60} placeholder="Toyota" required /></label>
        <label className="full-width">Model<input name="model" maxLength={80} placeholder="Camry" required /></label>
      </> : <>
        <label>Year<select name="year" required value={year} onChange={event => changeYear(event.target.value)}><option value="">Select year</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Make<select required disabled={!year || makesLoading || !!makesError} value={makeId} onChange={event => void changeMake(event.target.value)}>
          <option value="">{makesLoading ? "Loading makes…" : !year ? "Choose year first" : "Select make"}</option>{makes.map(make => <option key={make.id} value={make.id}>{make.name}</option>)}
        </select></label>
        <input type="hidden" name="make" value={makes.find(make => String(make.id) === makeId)?.name ?? ""} />
        <label className="full-width">Model<select name="model" required disabled={!makeId || modelsLoading || !models.length} value={model} onChange={event => setModel(event.target.value)}>
          <option value="">{modelsLoading ? "Loading models…" : !makeId ? "Choose make first" : !models.length ? "No models available" : "Select model"}</option>{models.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
        </select></label>
      </>}
      <label className="full-width">Mileage (miles)<input name="mileage" type="number" min="0" max="9999999" step="1" placeholder="24000" required aria-describedby="mileage-hint" /><span id="mileage-hint" className="field-hint">Your current odometer reading.</span></label>
    </div>
    {!manual && <>
      <p className="field-hint catalog-note">Cars, trucks, and SUVs. For a vehicle before 1996 or one not listed, use manual entry.</p>
      <p className="catalog-status" role="status">{makesLoading ? "Loading the vehicle directory…" : modelsLoading ? "Finding models…" : ""}</p>
      {(makesError || modelsError) && <p className="form-error" role="alert">{makesError || modelsError}</p>}
      <p className="catalog-source">Vehicle directory: <a href="https://vpic.nhtsa.dot.gov/" target="_blank" rel="noreferrer">NHTSA vPIC</a></p>
    </>}
  </>;
}
