import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/commerce";
import { getPublicWebinars } from "@/lib/data";
import { getPages } from "@/lib/pages";
import { getServiceLocations } from "@/lib/service-locations";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [webinars, products, pages, locations] = await Promise.all([getPublicWebinars(), getProducts(), getPages({ status: "published" }), getServiceLocations()]);
  const webinarEntries = webinars.map((webinar) => ({ url: `${baseUrl}/webinars/${webinar.slug}`, lastModified: new Date(webinar.startsAt), changeFrequency: "weekly" as const, priority: 0.8 }));
  const productEntries = products.map((product) => ({ url: `${baseUrl}/products/${product.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 }));
  const locationEntries = locations.map((location) => ({ url: `${baseUrl}/locations/${location.slug}`, lastModified: new Date(location.updatedAt), changeFrequency: "monthly" as const, priority: 0.6 }));
  const pageEntries = pages.filter((page) => !page.isHomepage && page.slug !== "products" && page.slug !== "service-locations" && !page.slug.startsWith("location-")).map((page) => ({ url: `${baseUrl}/pages/${page.slug}`, lastModified: new Date(page.updatedAt), changeFrequency: "monthly" as const, priority: 0.6 }));
  return [
    { url: `${baseUrl}/webinars`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/locations`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terms-and-conditions`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    ...webinarEntries, ...productEntries, ...locationEntries, ...pageEntries,
  ];
}
