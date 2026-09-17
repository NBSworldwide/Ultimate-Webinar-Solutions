import type { ProductListItem, PublicWebinarDetails, PublicWebinarListItem } from "@/lib/types";
import type { SiteSettings } from "@/lib/types";
import type { ContentPage } from "@/lib/types";
import type { ServiceLocation } from "@/content/locations";
import { absoluteSiteAssetUrl, DEFAULT_SITE_SETTINGS, siteAddressLines, siteContactEmail } from "@/lib/site-settings";

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

function organizationEntity(baseUrl: string, settings: SiteSettings): JsonLdObject {
  const addressLines = siteAddressLines(settings);
  const sameAs = [settings.linkedinUrl, settings.facebookUrl, settings.instagramUrl].filter(Boolean);
  return {
    "@type": "Organization",
    "@id": organizationId(baseUrl),
    name: settings.displayName,
    url: baseUrl,
    ...(settings.legalName ? { legalName: settings.legalName } : {}),
    description: settings.description || settings.tagline,
    ...(absoluteSiteAssetUrl(settings.logoUrl, baseUrl) ? { logo: absoluteSiteAssetUrl(settings.logoUrl, baseUrl) } : {}),
    ...(siteContactEmail(settings) ? { email: siteContactEmail(settings) } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(addressLines.length >= 3 ? { address: { "@type": "PostalAddress", streetAddress: [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", "), addressLocality: settings.city, addressRegion: settings.region, postalCode: settings.postalCode, addressCountry: settings.country } } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

function websiteEntity(baseUrl: string, settings: SiteSettings): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": websiteId(baseUrl),
    url: baseUrl,
    name: settings.displayName,
    description: settings.tagline || settings.description,
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

export function buildWebinarIndexGraph(webinars: PublicWebinarListItem[], settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/webinars`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      webPageEntity(baseUrl, url, "Live sessions", `Browse upcoming live sessions from ${settings.displayName}.`, { "@type": "CollectionPage", "@id": `${url}#collection` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Live sessions", item: url }]),
      {
        "@type": "ItemList",
        "@id": `${url}#events`,
        name: `Upcoming ${settings.displayName} sessions`,
        numberOfItems: webinars.length,
        itemListElement: webinars.map((webinar, index) => ({ "@type": "ListItem", position: index + 1, item: eventSummary(webinar, baseUrl) })),
      },
    ],
  };
}

export function buildWebinarGraph(webinar: PublicWebinarDetails, settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
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
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      webPageEntity(baseUrl, url, webinar.title, webinar.description, { "@id": eventId }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Live sessions", item: `${baseUrl}/webinars` }, { name: webinar.title, item: url }]),
      event,
    ],
  };
}

type ProductWithDetails = ProductListItem & { details?: string };

function productEntity(product: ProductWithDetails, baseUrl: string): JsonLdObject {
  const url = `${baseUrl}/products/${encodeURIComponent(product.slug)}`;
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    sku: product.sku,
    category: product.category,
    description: product.description,
    url,
    image: product.imageUrl ? [`${baseUrl}${product.imageUrl}`] : undefined,
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: product.inventoryQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
  };
}

export function buildProductIndexGraph(products: ProductListItem[], settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/products`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      webPageEntity(baseUrl, url, "Product catalog", `Physical products and shipped attendee kits from ${settings.displayName}.`, { "@type": "CollectionPage", "@id": `${url}#collection` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Product catalog", item: url }]),
      { "@type": "ItemList", "@id": `${url}#products`, name: `${settings.displayName} products`, numberOfItems: products.length, itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, item: productEntity(product, baseUrl) })) },
    ],
  };
}

export function buildProductGraph(product: ProductWithDetails, settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/products/${encodeURIComponent(product.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      webPageEntity(baseUrl, url, product.name, product.description, { "@id": `${url}#product` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Product catalog", item: `${baseUrl}/products` }, { name: product.name, item: url }]),
      productEntity(product, baseUrl),
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

export function buildLocationIndexGraph(locations: ServiceLocation[], settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/locations`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
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

export function buildLocationGraph(location: ServiceLocation, settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/locations/${encodeURIComponent(location.slug)}`;
  const service = serviceEntity(location, baseUrl);
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      placeEntity(location, baseUrl),
      webPageEntity(baseUrl, url, location.title, location.summary, { "@id": `${url}#service` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: "Service locations", item: `${baseUrl}/locations` }, { name: `${location.city}, ${location.region}`, item: url }]),
      service,
    ],
  };
}

export function buildContentPageGraph(page: ContentPage, settings: SiteSettings = DEFAULT_SITE_SETTINGS, baseUrl = siteUrl()): JsonLdObject {
  const url = `${baseUrl}/pages/${encodeURIComponent(page.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationEntity(baseUrl, settings),
      websiteEntity(baseUrl, settings),
      webPageEntity(baseUrl, url, page.title, page.seoDescription || page.excerpt, { "@type": "WebPage", "@id": `${url}#content` }),
      breadcrumbEntity(url, [{ name: "Home", item: baseUrl }, { name: page.title, item: url }]),
    ],
  };
}
