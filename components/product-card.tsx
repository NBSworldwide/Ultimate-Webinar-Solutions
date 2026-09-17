import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { ProductListItem } from "@/lib/types";

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <article className="product-card">
      <div className="product-art" aria-hidden="true"><Package size={30} /><span>{product.category}</span></div>
      <div className="product-card-copy"><span className="eyebrow">{product.category} · {product.sku}</span><h2>{product.name}</h2><p>{product.description}</p><div className="product-card-footer"><strong>{formatMoney(product.priceCents)}</strong><span>{product.inventoryQuantity} available</span><Link href={`/products/${product.slug}`} className="button button-small">View product <ArrowUpRight size={14} /></Link></div></div>
    </article>
  );
}
