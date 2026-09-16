import type { PublicWebinarDetails, PublicWebinarListItem } from "@/lib/types";
import type { ServiceLocation } from "@/content/locations";

export type JsonLdObject = Record<string, unknown>;

export function siteUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function organizationId(baseUrl: string): string {
  return `${baseUrl}/#organization`;
}

function websiteId(baseUrl: string): string {
  return `${baseUrl}/#website`;
}

function organizationEntity(baseUrl: string): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": organizationId(baseUrl),
    name: "Webinar Studio",
    url: baseUrl,
    description: "A standalone workspace for planning, publishing, and operating live webinar sessions.",
  };
}

function websiteEntity(baseUrl: string): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": websiteId(baseUrl),
    url: baseUrl,
    name: "Webinar Studio",
    publisher: { "@id": organizationId(baseUrl) },
  };
}

function webPageEntity(baseUrl: string, url: string, name: string, description: string, about?: JsonLdObject): JsonLdObject {
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": websiteId(baseUrl) },
    publisher: { "@id": organizationId(baseUrl) },
    ...(about ? { about } : {}),
  };
}

function breadcrumbEntity(url: string, items: Array<{ name: string; item: string }>): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function eventStatus(status: PublicWebinarDetails["status"]): string {
  return status === "completed" ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled";
}

function eventSummary(webinar: PublicWebinarListItem, baseUrl: string): JsonLdObject {
  const url = `${baseUrl}/webinars/${encodeURIComponent(webinar.slug)}`;
  return {
    "@type": "Event",
    "@id": `${url}#event`,
    name: webinar.title,
    description: webinar.description,
    url,
    startDate: webinar.startsAt,
    duration: `PT${webinar.durationMinutes}M`,
    eventStatus: eventStatus(webinar.status),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url },
    organizer: { "@id": organizationId(baseUrl) },
  };
}

export function buildWebinarIndexGraph(webinars: PublicWebinarListItem[], baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/webinars`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl),
      websiteEntity(baseUrl),
      webPageEntity(baseUrl, url, "Live sessions", "Browse upcoming live sessions from Webinar Studio.", { "@type": "CollectionPage", "@id": `${url}#collection` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Live sessions", item: url }]),
      {
        "@type": "ItemList",
        "@id": `${url}#events`,
        name: "Upcoming Webinar Studio sessions",
        numberOfItems: webinars.length,
        itemListElement: webinars.map((webinar, index) => ({ "@type": "ListItem", position: index + 1, item: eventSummary(webinar, baseUrl) })),
      },
    ],
  };
}

export function buildWebinarGraph(webinar: PublicWebinarDetails, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/webinars/${encodeURIComponent(webinar.slug)}`;
  const eventId = `${url}#event`;
  const offers = webinar.tiers.map((tier) => {
    const available = tier.seats.filter((seat) => seat.status === "available").length;
    return {
      "@type": "Offer",
      "@id": `${url}#offer-${encodeURIComponent(tier.id)}`,
      name: tier.name,
      price: (tier.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: available > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url,
      validFrom: webinar.startsAt,
    };
  });
  const event: JsonLdObject = {
    "@type": "Event",
    "@id": eventId,
    name: webinar.title,
    description: webinar.longDescription,
    url,
    startDate: webinar.startsAt,
    duration: `PT${webinar.durationMinutes}M`,
    eventStatus: eventStatus(webinar.status),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url },
    organizer: { "@id": organizationId(baseUrl) },
    performer: { "@type": "Person", "@id": `${url}#host`, name: webinar.hostName, description: webinar.hostBio },
    offers,
    isAccessibleForFree: webinar.tiers.every((tier) => tier.priceCents === 0),
    mainEntityOfPage: { "@id": `${url}#webpage` },
    potentialAction: { "@type": "RegisterAction", target: url, name: "Register for this webinar" },
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl),
      websiteEntity(baseUrl),
      webPageEntity(baseUrl, url, webinar.title, webinar.description, { "@id": eventId }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Live sessions", item: `${baseUrl}/webinars` }, { name: webinar.title, item: url }]),
      event,
    ],
  };
}

function serviceEntity(location: ServiceLocation, baseUrl: string): JsonLdObject {
  const url = `${baseUrl}/locations/${encodeURIComponent(location.slug)}`;
  const placeId = `${url}#place`;
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: `Webinar facilitation and operations support in ${location.city}, ${location.region}`,
    serviceType: "Webinar facilitation and event operations",
    description: location.description,
    provider: { "@id": organizationId(baseUrl) },
    areaServed: { "@id": placeId },
    availableChannel: { "@type": "ServiceChannel", serviceUrl: url, serviceType: "Virtual delivery" },
  };
}

function placeEntity(location: ServiceLocation, baseUrl: string): JsonLdObject {
  const url = `${baseUrl}/locations/${encodeURIComponent(location.slug)}`;
  return {
    "@type": "Place",
    "@id": `${url}#place`,
    name: `${location.city}, ${location.region}`,
    address: { "@type": "PostalAddress", addressLocality: location.city, addressRegion: location.region, addressCountry: "US" },
  };
}

export function buildLocationIndexGraph(locations: ServiceLocation[], baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/locations`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl),
      websiteEntity(baseUrl),
      webPageEntity(baseUrl, url, "Service locations", "Virtual-first webinar facilitation and operations coverage examples.", { "@type": "CollectionPage", "@id": `${url}#collection` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Service locations", item: url }]),
      {
        "@type": "ItemList",
        "@id": `${url}#locations`,
        name: "Sample webinar service locations",
        numberOfItems: locations.length,
        itemListElement: locations.map((location, index) => {
          const locationUrl = `${baseUrl}/locations/${encodeURIComponent(location.slug)}`;
          return { "@type": "ListItem", position: index + 1, item: { "@id": `${locationUrl}#service`, "@type": "Service", name: location.title, url: locationUrl, areaServed: { "@id": `${locationUrl}#place` } } };
        }),
      },
    ],
  };
}

export function buildLocationGraph(location: ServiceLocation, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/locations/${encodeURIComponent(location.slug)}`;
  const service = serviceEntity(location, baseUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl),
      websiteEntity(baseUrl),
      placeEntity(location, baseUrl),
      webPageEntity(baseUrl, url, location.title, location.summary, { "@id": `${url}#service` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Service locations", item: `${baseUrl}/locations` }, { name: `${location.city}, ${location.region}`, item: url }]),
      service,
    ],
  };
}
