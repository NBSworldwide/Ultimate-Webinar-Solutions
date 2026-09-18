import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, ShieldCheck } from "lucide-react";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PageRenderer } from "@/components/page-renderer";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getApprovedTestimonials } from "@/lib/testimonials";
import { getProducts } from "@/lib/commerce";
import { getForms } from "@/lib/forms";
import { getNavigationMenus } from "@/lib/navigation";
import { getPublishedPageBySlug } from "@/lib/pages";
import { buildProductIndexGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageBySlug("products");
  if (page) return { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt, alternates: { canonical: "/products" } };
  const settings = await getSiteSettings();
  return { title: "Product catalog", description: `Browse physical products and shipped attendee kits from ${settings.displayName}.`, alternates: { canonical: "/products" } };
}

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ category?: string; product_page?: string }> }) {
  const params = (await searchParams) ?? {};
  const category = params.category?.trim() ?? "";
  const productPage = Math.max(1, Math.min(100, Number(params.product_page) || 1));
  const page = await getPublishedPageBySlug("products");
  if (!page) notFound();
  const [products, settings, testimonials, navigationMenus, forms] = await Promise.all([getProducts(true, { category }), getSiteSettings(), getApprovedTestimonials(), getNavigationMenus(), getForms({ status: "published" })]);
  return <div className="public-shell"><EntityGraph data={buildProductIndexGraph(products, settings)} /><PublicHeader /><main className="public-main content-page-main" id="main-content"><PageRenderer blocks={page.blocks} products={products} testimonials={testimonials} navigationMenus={navigationMenus} forms={forms} filterCategory={category} productPage={productPage} /></main><PublicFooter /></div>;
}
