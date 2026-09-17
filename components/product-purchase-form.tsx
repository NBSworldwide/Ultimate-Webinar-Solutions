"use client";

import { useState } from "react";
import { CheckCircle2, Package, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { ProductListItem } from "@/lib/types";

export function ProductPurchaseForm({ product }: { product: ProductListItem }) {
  const [variantId, setVariantId] = useState<string | null>(product.variants?.[0]?.id ?? null);
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ orderNumber: string; totalCents: number } | null>(null);
  const selectedVariant = product.variants?.find((variant) => variant.id === variantId);
  const unitPrice = selectedVariant?.priceCents ?? product.priceCents;
  const available = selectedVariant?.inventoryQuantity ?? product.inventoryQuantity;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Number(quantity), variantId, customerName: form.get("customerName"), customerEmail: form.get("customerEmail"), customerPhone: form.get("customerPhone"), shippingName: form.get("shippingName"), shippingAddressLine1: form.get("shippingAddressLine1"), shippingAddressLine2: form.get("shippingAddressLine2"), shippingCity: form.get("shippingCity"), shippingRegion: form.get("shippingRegion"), shippingPostalCode: form.get("shippingPostalCode"), shippingCountry: form.get("shippingCountry") }) });
      const data = await response.json() as { order?: { orderNumber: string; totalCents: number }; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error ?? "The order could not be created.");
      setOrder(data.order); event.currentTarget.reset(); setQuantity("1");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The order could not be created."); } finally { setSaving(false); }
  }

  if (order) return <section className="checkout-success" aria-live="polite"><CheckCircle2 size={24} /><span className="eyebrow">Demo order recorded</span><h2>Order {order.orderNumber} is ready for fulfillment.</h2><p>The demo checkout marked payment as paid and placed the order in the unfulfilled queue. In production, a payment provider webhook would confirm this state.</p><strong>Total {formatMoney(order.totalCents)}</strong></section>;

  return <form className="registration-card product-checkout" onSubmit={submit}><div className="checkout-heading"><ShoppingBag size={17} /><div><span className="eyebrow">Demo checkout</span><h2>Ship this product</h2></div></div><p>Enter a shipping destination to create a synthetic order. Real payment and carrier adapters can be connected later.</p><div className="form-grid">{product.variants && product.variants.length > 0 ? <div className="field"><label htmlFor="product-variant">Choose an option</label><select id="product-variant" value={variantId ?? ""} onChange={(event) => setVariantId(event.target.value || null)}>{product.variants.filter((variant) => variant.status === "active").map((variant) => <option key={variant.id} value={variant.id}>{variant.name} · {formatMoney(variant.priceCents)} · {variant.inventoryQuantity} available</option>)}</select></div> : null}<div className="field"><label htmlFor="product-quantity">Quantity</label><input id="product-quantity" name="quantity" type="number" min="1" max={Math.min(25, available)} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div><div className="form-row"><div className="field"><label htmlFor="customer-name">Customer name</label><input id="customer-name" name="customerName" autoComplete="name" required /></div><div className="field"><label htmlFor="customer-email">Email</label><input id="customer-email" name="customerEmail" type="email" autoComplete="email" required /></div></div><div className="field"><label htmlFor="customer-phone">Phone</label><input id="customer-phone" name="customerPhone" type="tel" autoComplete="tel" required /></div><div className="field"><label htmlFor="shipping-name">Ship to name</label><input id="shipping-name" name="shippingName" autoComplete="shipping name" required /></div><div className="field"><label htmlFor="shipping-address">Address</label><input id="shipping-address" name="shippingAddressLine1" autoComplete="shipping address-line1" required /></div><div className="field"><label htmlFor="shipping-address-2">Address line 2</label><input id="shipping-address-2" name="shippingAddressLine2" autoComplete="shipping address-line2" /></div><div className="form-row"><div className="field"><label htmlFor="shipping-city">City</label><input id="shipping-city" name="shippingCity" autoComplete="shipping address-level2" required /></div><div className="field"><label htmlFor="shipping-region">State / region</label><input id="shipping-region" name="shippingRegion" autoComplete="shipping address-level1" required /></div></div><div className="form-row"><div className="field"><label htmlFor="shipping-postal">Postal code</label><input id="shipping-postal" name="shippingPostalCode" autoComplete="shipping postal-code" required /></div><div className="field"><label htmlFor="shipping-country">Country</label><input id="shipping-country" name="shippingCountry" value="US" maxLength={2} autoComplete="shipping country" required readOnly /></div></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button" type="submit" disabled={saving || available < 1}><Package size={15} />{saving ? "Recording order…" : `Place demo order · ${formatMoney(unitPrice * Number(quantity || 1))}`}</button></div></form>;
}
