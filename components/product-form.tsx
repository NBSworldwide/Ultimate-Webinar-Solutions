"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProductListItem } from "@/lib/types";

type EditableProduct = ProductListItem & { details: string };

export function ProductForm({ product }: { product?: EditableProduct }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(product ? `/api/admin/products/${encodeURIComponent(product.id)}` : "/api/admin/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), sku: form.get("sku"), description: form.get("description"), details: form.get("details"), category: form.get("category"), priceCents: Math.round(Number(form.get("price")) * 100), compareAtPriceCents: form.get("compareAtPrice") ? Math.round(Number(form.get("compareAtPrice")) * 100) : null, salePriceCents: form.get("salePrice") ? Math.round(Number(form.get("salePrice")) * 100) : null, saleStartsAt: form.get("saleStartsAt") ? new Date(String(form.get("saleStartsAt"))).toISOString() : null, saleEndsAt: form.get("saleEndsAt") ? new Date(String(form.get("saleEndsAt"))).toISOString() : null, inventoryQuantity: Number(form.get("inventoryQuantity")), weightGrams: Number(form.get("weightGrams")), status: form.get("status"),
      }) });
      const data = await response.json() as { product?: { slug: string }; error?: string };
      if (!response.ok || !data.product) throw new Error(data.error ?? `The product could not be ${product ? "updated" : "created"}.`);
      if (!product) router.push(`/admin/products#${data.product.slug}`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `The product could not be ${product ? "updated" : "created"}.`);
      setSaving(false);
    }
  }

  return <form className="admin-form-card" onSubmit={submit}><h2>{product ? `Edit ${product.name}` : "Add a physical product"}</h2><div className="form-grid"><div className="form-row"><div className="field"><label htmlFor={`product-name-${product?.id ?? "new"}`}>Product name</label><input id={`product-name-${product?.id ?? "new"}`} name="name" defaultValue={product?.name} placeholder="Field Notes Workbook" required /></div><div className="field"><label htmlFor={`product-sku-${product?.id ?? "new"}`}>SKU</label><input id={`product-sku-${product?.id ?? "new"}`} name="sku" defaultValue={product?.sku} placeholder="WS-FNW-001" required /></div></div><div className="field"><label htmlFor={`product-description-${product?.id ?? "new"}`}>Short description</label><textarea id={`product-description-${product?.id ?? "new"}`} name="description" defaultValue={product?.description} placeholder="What is this item for?" required /></div><div className="field"><label htmlFor={`product-details-${product?.id ?? "new"}`}>Fulfillment details</label><textarea id={`product-details-${product?.id ?? "new"}`} name="details" defaultValue={product?.details} placeholder="What is included, how is it packaged, and what should the customer know?" required /></div><div className="form-row"><div className="field"><label htmlFor={`product-category-${product?.id ?? "new"}`}>Category</label><input id={`product-category-${product?.id ?? "new"}`} name="category" defaultValue={product?.category} placeholder="Event kits" required /></div><div className="field"><label htmlFor={`product-status-${product?.id ?? "new"}`}>Status</label><select id={`product-status-${product?.id ?? "new"}`} name="status" defaultValue={product?.status ?? "draft"}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div></div><div className="form-row"><div className="field"><label htmlFor={`product-price-${product?.id ?? "new"}`}>Regular price (USD)</label><input id={`product-price-${product?.id ?? "new"}`} name="price" type="number" min="0" step="0.01" defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined} placeholder="24.00" required /></div><div className="field"><label htmlFor={`product-compare-price-${product?.id ?? "new"}`}>Compare-at price (USD)</label><input id={`product-compare-price-${product?.id ?? "new"}`} name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={product?.compareAtPriceCents == null ? undefined : (product.compareAtPriceCents / 100).toFixed(2)} placeholder="29.00" /></div></div><div className="form-row"><div className="field"><label htmlFor={`product-sale-price-${product?.id ?? "new"}`}>Sale price (optional)</label><input id={`product-sale-price-${product?.id ?? "new"}`} name="salePrice" type="number" min="0" step="0.01" defaultValue={product?.salePriceCents == null ? undefined : (product.salePriceCents / 100).toFixed(2)} placeholder="19.00" /></div><div className="field"><label htmlFor={`product-inventory-${product?.id ?? "new"}`}>Inventory quantity</label><input id={`product-inventory-${product?.id ?? "new"}`} name="inventoryQuantity" type="number" min="0" step="1" defaultValue={product?.inventoryQuantity} placeholder="50" required /></div></div><div className="form-row"><div className="field"><label htmlFor={`product-sale-start-${product?.id ?? "new"}`}>Sale starts</label><input id={`product-sale-start-${product?.id ?? "new"}`} name="saleStartsAt" type="datetime-local" defaultValue={product?.saleStartsAt ? product.saleStartsAt.slice(0, 16) : undefined} /></div><div className="field"><label htmlFor={`product-sale-end-${product?.id ?? "new"}`}>Sale ends</label><input id={`product-sale-end-${product?.id ?? "new"}`} name="saleEndsAt" type="datetime-local" defaultValue={product?.saleEndsAt ? product.saleEndsAt.slice(0, 16) : undefined} /></div></div><div className="field"><label htmlFor={`product-weight-${product?.id ?? "new"}`}>Shipping weight (grams)</label><input id={`product-weight-${product?.id ?? "new"}`} name="weightGrams" type="number" min="0" step="1" defaultValue={product?.weightGrams} placeholder="250" required /></div><p className="field-help">Use compare-at pricing for the crossed-out reference price. A sale is active only inside its optional date window.</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button" type="submit" disabled={saving}><PackagePlus size={15} />{saving ? "Saving product…" : product ? "Save changes" : "Save product"}</button></div></form>;
}
