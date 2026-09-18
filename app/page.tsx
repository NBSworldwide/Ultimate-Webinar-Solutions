import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PageRenderer } from "@/components/page-renderer";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { getApprovedTestimonials } from "@/lib/testimonials";
import { getForms } from "@/lib/forms";
import { getProducts } from "@/lib/commerce";
import { getPublishedHomepage } from "@/lib/pages";
import { getNavigationMenus } from "@/lib/navigation";
import { buildContentPageGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedHomepage();
  if (!page) return { title: "Webinar Studio" };
  return { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt, alternates: { canonical: "/" } };
}

export default async function HomePage() {
  const page = await getPublishedHomepage();
  if (!page) notFound();
  const [settings, products, testimonials, navigationMenus, forms] = await Promise.all([getSiteSettings(), getProducts(), getApprovedTestimonials(), getNavigationMenus(), getForms({ status: "published" })]);
  return <div className="public-shell"><EntityGraph data={buildContentPageGraph(page, settings)} /><PublicHeader /><main className="public-main content-page-main" id="main-content"><PageRenderer blocks={page.blocks} products={products} testimonials={testimonials} navigationMenus={navigationMenus} forms={forms} /></main><PublicFooter /></div>;
}
