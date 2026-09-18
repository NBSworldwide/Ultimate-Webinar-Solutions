import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { ProductListItem } from "@/lib/types";

export interface ProductCardOptions {
  showImage?: boolean;
  showSku?: boolean;
  showDescription?: boolean;
  showPrice?: boolean;
  showInventory?: boolean;
  showButton?: boolean;
  buttonLabel?: string;
  cardStyle?: "card" | "minimal";
}

export function ProductCard({ product, options = {} }: { product: ProductListItem; options?: ProductCardOptions }) {
  const showImage = options.showImage ?? true;
  const showSku = options.showSku ?? true;
  const showDescription = options.showDescription ?? true;
  const showPrice = options.showPrice ?? true;
  const showInventory = options.showInventory ?? true;
  const showButton = options.showButton ?? true;
  const displayPrice = product.salePriceCents ?? product.priceCents;
  const hasSale = product.salePriceCents !== null && product.salePriceCents < product.priceCents;
  const buttonLabel = options.buttonLabel?.trim() || "View product";
  return (
    <article className={`product-card ${options.cardStyle === "minimal" ? "product-card-minimal" : ""}`}>
      {showImage ? <div className="product-art" aria-hidden="true">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <><Package size={30} /><span>{product.category}</span></>}</div> : null}
      <div className="product-card-copy"><span className="eyebrow">{product.category}{showSku ? ` · ${product.sku}` : ""}</span><h2>{product.name}</h2>{showDescription ? <p>{product.description}</p> : null}<div className="product-card-footer">{showPrice ? <strong className={hasSale ? "has-sale" : ""}>{formatMoney(displayPrice)}{hasSale ? <del>{formatMoney(product.priceCents)}</del> : null}</strong> : null}{showInventory ? <span>{product.inventoryQuantity} available</span> : null}{showButton ? <Link href={`/products/${product.slug}`} className="button button-small">{buttonLabel} <ArrowUpRight size={14} /></Link> : null}</div></div>
    </article>
  );
}
