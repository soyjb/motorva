export type CatalogOption = { id: number; name: string };

const BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";
let makesRequest: Promise<CatalogOption[]> | undefined;

export function catalogOptions(data: unknown, kind: "make" | "model"): CatalogOption[] {
  if (typeof data !== "object" || data === null || !Array.isArray((data as { Results?: unknown }).Results)) {
    throw new Error("Invalid vehicle directory response");
  }
  const options = new Map<string, CatalogOption>();
  for (const row of (data as { Results: unknown[] }).Results) {
    if (typeof row !== "object" || row === null) throw new Error("Invalid vehicle directory row");
    const entry = row as Record<string, unknown>;
    const id = entry[kind === "make" ? "MakeId" : "Model_ID"];
    const name = entry[kind === "make" ? "MakeName" : "Model_Name"];
    if (!Number.isSafeInteger(id) || Number(id) <= 0 || typeof name !== "string" || !name.trim()) {
      throw new Error("Invalid vehicle directory option");
    }
    const trimmed = name.trim();
    if (trimmed.length > (kind === "make" ? 60 : 80)) continue;
    options.set(trimmed.toLowerCase(), { id: Number(id), name: trimmed });
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function request(path: string, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${BASE_URL}/${path}?format=json`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error("Vehicle directory unavailable");
  return response.json() as Promise<unknown>;
}

export function getMakes() {
  // Share one request per browser session rather than fetching on every dialog open.
  makesRequest ??= Promise.all(["car", "truck", "multipurpose passenger vehicle"].map(async type =>
    catalogOptions(await request(`GetMakesForVehicleType/${encodeURIComponent(type)}`), "make")
  )).then(groups => {
    const merged = new Map<number, CatalogOption>();
    for (const group of groups) for (const option of group) merged.set(option.id, option);
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  }).catch(error => { makesRequest = undefined; throw error; });
  return makesRequest;
}

export async function getModels(makeId: number, year: number, signal: AbortSignal) {
  return catalogOptions(await request(`GetModelsForMakeIdYear/makeId/${makeId}/modelyear/${year}`, signal), "model");
}
