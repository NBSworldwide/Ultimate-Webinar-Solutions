"use client";

import { useEffect, useState } from "react";

type Place = {
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string;
};

export function MapPlaceCard({ query }: { query: string }) {
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    fetch(`/api/maps/place?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { place?: Place | null } : { place: null })
      .then((payload) => setPlace(payload.place ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [query]);

  if (!place) return null;
  const rating = place.rating === null ? null : Math.round(place.rating * 10) / 10;
  const stars = place.rating === null ? "" : `${"★".repeat(Math.round(place.rating))}${"☆".repeat(5 - Math.round(place.rating))}`;
  const label = rating === null ? "Google Maps place" : `${rating} out of 5 stars`;

  return <aside className="content-map-place-card" aria-label={`${place.name || "Place"} Google Maps details`}>
    <div className="content-map-place-copy"><strong>{place.name || "Selected place"}</strong>{place.address ? <span>{place.address}</span> : null}</div>
    <div className="content-map-place-rating" aria-label={label}>{rating !== null ? <><span aria-hidden="true">{stars}</span><strong>{rating.toFixed(1)}</strong>{place.reviewCount !== null ? <span>({place.reviewCount.toLocaleString()} reviews)</span> : null}</> : <span>Google Maps place</span>}</div>
    {place.mapsUrl ? <a href={place.mapsUrl} target="_blank" rel="noreferrer">View on Google Maps</a> : null}
  </aside>;
}
