export type MapManifest = {
  tiles: Array<{
    cadastralMunicipalityCode: string;
    url: string;
    bbox: number[];
  }>;
};

const manifestPromises = new Map<string, Promise<MapManifest>>();

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nalaganje ${url} ni uspelo (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function getMapManifest(kind: "parcels" | "buildings") {
  const url = `/data/map/${kind}/manifest.json`;
  if (!manifestPromises.has(url)) {
    manifestPromises.set(url, fetchJson<MapManifest>(url));
  }
  return manifestPromises.get(url) as Promise<MapManifest>;
}
