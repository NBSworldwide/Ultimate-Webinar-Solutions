import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package, Search, Truck } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { ProductVariantManager } from "@/components/product-variant-manager";
import { getProductVariants } from "@/lib/catalog";
import { getProducts } from "@/lib/commerce";
import { formatMoney } from "@/lib/format";
import type { ProductStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products", robots: { index: false, follow: false } };
const statuses: Array<ProductStatus | "all"> = ["all", "draft", "active", "archived"];

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as ProductStatus | "all") ? params.status as ProductStatus | "all" : "all";
  const query = params.q?.trim() ?? "";
  const products = await getProducts(false, { query, status });
  const variants = Object.fromEntries(await Promise.all(products.map(async (product) => [product.id, await getProductVariants(product.id)] as const)));
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Commerce management</span><h1 className="page-title">Products.</h1><p className="page-subtitle">Manage physical inventory separately from webinar registrations. Product orders record shipping and fulfillment states.</p></div><Link href="#new-product" className="button">Add new product <ArrowUpRight size={14} /></Link></div><div className="notice-banner"><Truck size={17} /><span><strong>Provider-neutral fulfillment.</strong> The demo records paid orders and shipping states locally. Connect a payment gateway and carrier adapter before taking real orders.</span></div><section className="panel"><div className="admin-filter-bar"><form method="get" className="admin-filter-form"><div className="admin-search-field"><Search size={15} /><input name="q" defaultValue={query} placeholder="Search products, SKUs, or categories" aria-label="Search products" /></div><select name="status" defaultValue={status} aria-label="Filter products by status">{statuses.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>)}</select><button className="button button-small" type="submit">Filter</button>{query || status !== "all" ? <Link href="/admin/products" className="panel-link">Clear</Link> : null}</form><span className="row-meta">{products.length} result{products.length === 1 ? "" : "s"}</span></div><div className="panel-header"><h2 className="panel-title">Catalog <span className="muted">({products.length})</span></h2><span className="eyebrow">Synthetic samples</span></div>{products.length > 0 ? <div className="product-admin-list">{products.map((product) => <article className="product-admin-row" id={product.slug} key={product.id}><span className="product-admin-icon"><Package size={17} /></span><span><strong>{product.name}</strong><small>{product.sku} · {product.category} · {product.status}</small></span><span className="row-metric"><strong>{formatMoney(product.priceCents)}</strong><small>{product.inventoryQuantity} in stock</small></span><details className="product-edit-details"><summary>Edit</summary><ProductForm product={product} /></details><details className="product-edit-details"><summary>Variants ({variants[product.id]?.length ?? 0})</summary><ProductVariantManager productId={product.id} variants={variants[product.id] ?? []} /></details></article>)}</div> : <div className="empty-state"><Package size={20} /><h3>No products match these filters</h3><Link href="/admin/products" className="panel-link" style={{ marginTop: 12 }}>Clear filters</Link></div>}</section><section id="new-product" style={{ marginTop: 21 }}><ProductForm /></section></div>;
}
