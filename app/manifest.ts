import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  return {
    name: settings.displayName,
    short_name: settings.displayName,
    description: settings.description,
    start_url: "/webinars",
    display: "standalone",
    background_color: "#f7fbff",
    theme_color: "#102a43",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
