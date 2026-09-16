import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Webinar Studio",
    short_name: "Webinar Studio",
    description: "A standalone webinar operations and registration platform.",
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
