"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { ProductVariantView } from "@/lib/types";

export function ProductVariantManager({ productId, variants }: { productId: string; variants: ProductVariantView[] }) {
  const [items, setItems] = useState(variants);
  const [editing, setEditing] = useState<ProductVariantView | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const input = { ...(editing ? { id: editing.id } : {}), name: String(form.get("name") ?? ""), sku: String(form.get("sku") ?? ""), optionValues: {}, priceCents: Math.round(Number(form.get("price")) * 100), inventoryQuantity: Number(form.get("inventoryQuantity")), weightGrams: Number(form.get("weightGrams")), status: String(form.get("status") ?? "active") };
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/variants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { variant?: ProductVariantView; error?: string };
      if (!response.ok || !data.variant) throw new Error(data.error ?? "The variant could not be saved.");
      setItems((current) => editing ? current.map((item) => item.id === data.variant?.id ? data.variant as ProductVariantView : item) : [...current, data.variant as ProductVariantView]);
      setEditing(null); setMessage("Variant saved."); event.currentTarget.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The variant could not be saved."); } finally { setSaving(false); }
  }

  return <div className="product-variant-manager"><div className="panel-header"><div><span className="eyebrow">Catalog variations</span><h3 className="panel-title">Variants <span className="muted">({items.length})</span></h3></div><button type="button" className="button button-small button-secondary" onClick={() => setEditing(null)}><Plus size={14} /> Add variant</button></div>{items.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.sku}</td><td>{formatMoney(item.priceCents)}</td><td>{item.inventoryQuantity}</td><td>{item.status}</td><td><button type="button" className="panel-link" onClick={() => setEditing(item)}>Edit</button></td></tr>)}</tbody></table></div> : <p className="muted">No variants yet. Add variations when size, color, bundle, or other selectable options change the SKU.</p>}<form className="catalog-inline-form" onSubmit={save}><div className="form-row"><div className="field"><label>Variant name</label><input name="name" defaultValue={editing?.name} placeholder="Black / Large" required /></div><div className="field"><label>SKU</label><input name="sku" defaultValue={editing?.sku} placeholder="WS-KIT-BLK-L" required /></div></div><div className="form-row"><div className="field"><label>Price (USD)</label><input name="price" type="number" min="0" step="0.01" defaultValue={editing ? (editing.priceCents / 100).toFixed(2) : undefined} required /></div><div className="field"><label>Inventory</label><input name="inventoryQuantity" type="number" min="0" step="1" defaultValue={editing?.inventoryQuantity ?? 0} required /></div><div className="field"><label>Status</label><select name="status" defaultValue={editing?.status ?? "active"}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div></div>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}<button className="button button-small" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : editing ? "Save variant" : "Create variant"}</button></form></div>;
}
