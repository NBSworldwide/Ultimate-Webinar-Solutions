export type MapLocationMode = "address" | "coordinates";

export type NormalizedMapLocation =
  | { mode: "address"; query: string; label: string }
  | { mode: "coordinates"; query: string; label: string; latitude: number; longitude: number };

function cleanText(value: unknown, max = 240): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function coordinate(value: unknown, minimum: number, maximum: number): number | undefined {
  const raw = cleanText(value, 40);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

/**
 * Resolve the two supported map inputs into a safe query string. The value is
 * encoded by the renderer, and coordinates are range-checked before they can
 * be used in a Google Maps URL.
 */
export function normalizeMapLocation(data: Record<string, string | number>): NormalizedMapLocation | null {
  const mode: MapLocationMode = data.locationMode === "coordinates" ? "coordinates" : "address";
  if (mode === "coordinates") {
    const latitude = coordinate(data.latitude, -90, 90);
    const longitude = coordinate(data.longitude, -180, 180);
    if (latitude === undefined || longitude === undefined) return null;
    const query = `${latitude},${longitude}`;
    return { mode, query, label: query, latitude, longitude };
  }

  const address = cleanText(data.address ?? data.location);
  return address ? { mode, query: address, label: address } : null;
}

export function hasMapCoordinateInput(data: Record<string, string | number>): boolean {
  return cleanText(data.latitude, 40) !== "" || cleanText(data.longitude, 40) !== "";
}
