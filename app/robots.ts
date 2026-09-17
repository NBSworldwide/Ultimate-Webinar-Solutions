import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/webinars", "/products", "/locations", "/pages", "/privacy-policy", "/terms-and-conditions"], disallow: ["/admin", "/account", "/api", "/login", "/private-webinars"] }],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
