import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Package, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { EntityGraph } from "@/components/seo/entity-graph";
import { ProductPurchaseForm } from "@/components/product-purchase-form";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getProductBySlug } from "@/lib/commerce";
import { formatMoney } from "@/lib/format";
import { buildProductGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return product ? { title: product.name, description: product.description, alternates: { canonical: `/products/${product.slug}` } } : { title: "Product not found" };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [product, settings] = await Promise.all([getProductBySlug((await params).slug), getSiteSettings()]);
  if (!product) notFound();
  return <div className="public-shell"><EntityGraph data={buildProductGraph(product, settings)} /><PublicHeader /><main className="public-main" id="main-content"><Link href="/products" className="breadcrumb"><ArrowLeft size={13} /> Product catalog</Link><div className="product-detail" style={{ marginTop: 29 }}><article className="product-detail-copy"><div className="product-art product-art-large" aria-hidden="true"><Package size={48} /><span>{product.category}</span></div><span className="eyebrow">{product.category} · {product.sku}</span><h1>{product.name}</h1><p>{product.description}</p><div className="product-price">{formatMoney(product.priceCents)}</div><div className="product-facts"><span><CheckCircle2 size={14} />{product.inventoryQuantity} units available</span><span><Truck size={14} />Pack-and-ship fulfillment</span></div><section className="product-details-copy"><span className="eyebrow">Product details</span><p>{product.details}</p><AddToCartButton product={product} /></section></article><ProductPurchaseForm product={product} /></div></main><PublicFooter /></div>;
}
