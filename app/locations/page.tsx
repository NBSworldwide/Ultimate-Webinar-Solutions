import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PageRenderer } from "@/components/page-renderer";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getApprovedTestimonials } from "@/lib/testimonials";
import { getForms } from "@/lib/forms";
import { getProducts } from "@/lib/commerce";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getNavigationMenus } from "@/lib/navigation";
import { buildLocationIndexGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";
import { getServiceLocations } from "@/lib/service-locations";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageBySlug("service-locations");
  return { title: page?.seoTitle || page?.title || "Service locations", description: page?.seoDescription || page?.excerpt || "Virtual-first webinar facilitation and operations coverage examples.", alternates: { canonical: "/locations" } };
}

export default async function LocationsPage() {
  const page = await getPublishedPageBySlug("service-locations");
  if (!page) notFound();
  const [settings, products, testimonials, navigationMenus, forms, locations] = await Promise.all([getSiteSettings(), getProducts(), getApprovedTestimonials(), getNavigationMenus(), getForms({ status: "published" }), getServiceLocations()]);
  return (
    <div className="public-shell">
      <EntityGraph data={buildLocationIndexGraph(locations, settings)} />
      <PublicHeader />
      <main className="public-main content-page-main" id="main-content"><PageRenderer blocks={page.blocks} products={products} testimonials={testimonials} navigationMenus={navigationMenus} forms={forms} locations={locations} /></main>
      <PublicFooter />
    </div>
  );
}
