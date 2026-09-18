import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PageRenderer } from "@/components/page-renderer";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getPublishedPageBySlug } from "@/lib/pages";
import { getServiceLocation, getServiceLocations } from "@/lib/service-locations";
import { buildLocationGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

type LocationPageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = await getServiceLocation((await params).slug);
  if (!location) return { title: "Location not found" };
  const page = await getPublishedPageBySlug(location.pageSlug);
  return { title: page?.seoTitle || page?.title || location.title, description: page?.seoDescription || page?.excerpt || location.summary, alternates: { canonical: `/locations/${location.slug}` } };
}

export default async function LocationDetailPage({ params }: LocationPageProps) {
  const location = await getServiceLocation((await params).slug);
  if (!location) notFound();
  const [page, settings, locations] = await Promise.all([getPublishedPageBySlug(location.pageSlug), getSiteSettings(), getServiceLocations()]);
  if (!page) notFound();
  return (
    <div className="public-shell">
      <EntityGraph data={buildLocationGraph(location, settings)} />
      <PublicHeader />
      <main className="public-main content-page-main" id="main-content"><PageRenderer blocks={page.blocks} locations={locations} /></main>
      <PublicFooter />
    </div>
  );
}
