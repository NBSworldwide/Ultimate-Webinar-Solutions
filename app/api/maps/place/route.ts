import { NextResponse } from "next/server";

type GooglePlaceResponse = {
  places?: Array<{
    displayName?: { text?: unknown };
    formattedAddress?: unknown;
    rating?: unknown;
    userRatingCount?: unknown;
    googleMapsUri?: unknown;
  }>;
};

function cleanQuery(value: string | null): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function text(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function safeGoogleMapsUrl(value: unknown): string {
  const raw = text(value, 1_000);
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "www.google.com" || url.hostname === "maps.google.com") ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const query = cleanQuery(new URL(request.url).searchParams.get("q"));
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!apiKey) return NextResponse.json({ enabled: false, place: null });
  if (!query) return NextResponse.json({ enabled: true, place: null }, { status: 400 });

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: query, pageSize: 1 }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ enabled: true, place: null }, { status: 502 });

    const payload = await response.json() as GooglePlaceResponse;
    const candidate = payload.places?.[0];
    if (!candidate) return NextResponse.json({ enabled: true, place: null });

    return NextResponse.json({
      enabled: true,
      place: {
        name: text(candidate.displayName && typeof candidate.displayName === "object" ? candidate.displayName.text : "", 160),
        address: text(candidate.formattedAddress, 240),
        rating: number(candidate.rating, 0, 5),
        reviewCount: number(candidate.userRatingCount, 0, 10_000_000),
        mapsUrl: safeGoogleMapsUrl(candidate.googleMapsUri),
      },
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ enabled: true, place: null }, { status: 502 });
  }
}
