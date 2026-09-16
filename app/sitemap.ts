import type { MetadataRoute } from "next";
import { serviceLocations } from "@/content/locations";
import { getPublicWebinars } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const webinarEntries = (await getPublicWebinars()).map((webinar) => ({ url: `${baseUrl}/webinars/${webinar.slug}`, lastModified: new Date(webinar.startsAt), changeFrequency: "weekly" as const, priority: 0.8 }));
  const locationEntries = serviceLocations.map((location) => ({ url: `${baseUrl}/locations/${location.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 }));
  return [{ url: `${baseUrl}/webinars`, lastModified: new Date(), changeFrequency: "daily", priority: 1 }, { url: `${baseUrl}/locations`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 }, ...webinarEntries, ...locationEntries];
}
