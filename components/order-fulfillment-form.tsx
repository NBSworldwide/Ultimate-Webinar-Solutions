"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FulfillmentStatus, OrderView } from "@/lib/types";

export function OrderFulfillmentForm({ order }: { order: OrderView }) {
  const router = useRouter();
  const [status, setStatus] = useState<FulfillmentStatus>(order.fulfillmentStatus);
  const [carrier, setCarrier] = useState(order.trackingCarrier ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fulfillmentStatus: status, trackingCarrier: carrier || null, trackingNumber: tracking || null }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The order could not be updated.");
      setMessage("Saved");
      router.refresh();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "The order could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="order-fulfillment-form"><select aria-label={`Fulfillment status for ${order.orderNumber}`} value={status} onChange={(event) => setStatus(event.target.value as FulfillmentStatus)}><option value="unfulfilled">Unfulfilled</option><option value="packing">Packing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><input aria-label={`Carrier for ${order.orderNumber}`} value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Carrier" /><input aria-label={`Tracking number for ${order.orderNumber}`} value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Tracking number" /><button className="text-button" type="button" disabled={saving} onClick={() => void save()}><Save size={13} />{saving ? "Saving…" : "Save"}</button>{message ? <small className={message === "Saved" ? "form-success" : "form-error"}>{message}</small> : null}</div>;
}
