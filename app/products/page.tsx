import type { Metadata } from "next";
import Link from "next/link";
import { Package, ShieldCheck } from "lucide-react";
import { EntityGraph } from "@/components/seo/entity-graph";
import { ProductCard } from "@/components/product-card";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getProducts } from "@/lib/commerce";
import { buildProductIndexGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: "Product catalog", description: `Browse physical products and shipped attendee kits from ${settings.displayName}.`, alternates: { canonical: "/products" } };
}

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = (await searchParams) ?? {};
  const category = params.category?.trim() ?? "";
  const [products, settings] = await Promise.all([getProducts(true, { category }), getSiteSettings()]);
  return <div className="public-shell"><EntityGraph data={buildProductIndexGraph(products, settings)} /><PublicHeader /><main className="public-main" id="main-content"><section className="public-hero"><span className="eyebrow">Physical goods</span><h1>Products that extend the session.</h1><p>Browse standalone merchandise, production gear, and attendee kits. Each item can be purchased independently from a webinar registration.</p></section><div className="notice-banner"><ShieldCheck size={17} /><span><strong>Fresh-start catalog.</strong> These products are synthetic samples with server-authoritative inventory. No archived product records are connected.</span></div>{category ? <div className="catalog-toolbar"><span className="category-chip active">Category: {category}</span><Link className="panel-link" href="/products">Clear category</Link></div> : null}{products.length > 0 ? <section className="product-grid" aria-label={category ? `Products in ${category}` : "Product catalog"}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</section> : <div className="empty-state panel"><div className="empty-icon"><Package size={20} /></div><h3>No products are available yet</h3><p>{category ? "No active products match this category." : "Use the admin workspace to add the first product."}</p></div>}</main><PublicFooter /></div>;
}
