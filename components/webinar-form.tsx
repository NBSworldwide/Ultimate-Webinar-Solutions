"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import type { PricingModel, PricingRounding, WebinarVisibility } from "@/lib/types";

function centsFromDollars(value: string): number {
  const dollars = Number(value);
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : 0;
}

export function WebinarForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("Live session");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("75");
  const [hostName, setHostName] = useState("");
  const [tierName, setTierName] = useState("Standard seat");
  const [price, setPrice] = useState("49.00");
  const [itemValue, setItemValue] = useState("450.00");
  const [capacity, setCapacity] = useState("20");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [visibility, setVisibility] = useState<WebinarVisibility>("public");
  const [pricingModel, setPricingModel] = useState<PricingModel>("fixed_per_seat");
  const [roundingMode, setRoundingMode] = useState<PricingRounding>("exact_cents");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pricingPreview = useMemo(() => {
    const capacityValue = Math.max(1, Number(capacity) || 1);
    const referenceValueCents = centsFromDollars(itemValue);
    const fixedPriceCents = centsFromDollars(price);
    if (pricingModel === "fixed_per_seat") {
      return { priceCents: fixedPriceCents, referenceValueCents: null, projectedGrossCents: fixedPriceCents * capacityValue, upliftCents: null };
    }

    const calculatedCents = referenceValueCents / capacityValue;
    const priceCents = roundingMode === "round_up_dollar"
      ? Math.ceil(calculatedCents / 100) * 100
      : roundingMode === "nearest_dollar"
        ? Math.round(calculatedCents / 100) * 100
        : Math.round(calculatedCents);
    return {
      priceCents,
      referenceValueCents,
      projectedGrossCents: priceCents * capacityValue,
      upliftCents: priceCents * capacityValue - referenceValueCents,
    };
  }, [capacity, itemValue, price, pricingModel, roundingMode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const parsedStart = new Date(startsAt);
      if (Number.isNaN(parsedStart.getTime())) throw new Error("Enter a valid start time.");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
      const response = await fetch("/api/admin/webinars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eyebrow,
          description,
          startsAt: parsedStart.toISOString(),
          timezone,
          durationMinutes: Number(durationMinutes),
          hostName,
          tierName,
          priceCents: pricingPreview.priceCents,
          capacity: Number(capacity),
          status,
          visibility,
          pricingModel,
          referenceValueCents: pricingPreview.referenceValueCents,
          roundingMode,
        }),
      });
      const data = await response.json() as { webinar?: { id: string }; error?: string };
      if (!response.ok || !data.webinar) throw new Error(data.error ?? "The webinar could not be created.");
      router.push(`/admin/webinars/${data.webinar.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The webinar could not be created.");
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card" onSubmit={submit}>
      <h2>Session details</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="webinar-title">Title</label>
          <input id="webinar-title" name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The next practical leadership lab" required />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="webinar-eyebrow">Label</label>
            <input id="webinar-eyebrow" name="eyebrow" autoComplete="off" value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="webinar-host">Host</label>
            <input id="webinar-host" name="hostName" autoComplete="name" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Maya Chen" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="webinar-description">Description</label>
          <textarea id="webinar-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will attendees be able to do after this session?" required />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="webinar-start">Start time</label>
            <input id="webinar-start" name="startsAt" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
            <small>Saved with your browser time zone so the attendee time stays accurate.</small>
          </div>
          <div className="field">
            <label htmlFor="webinar-duration">Duration (minutes)</label>
            <input id="webinar-duration" name="durationMinutes" type="number" min="15" max="480" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required />
          </div>
        </div>

        <h2 style={{ marginTop: 12 }}>Visibility and access</h2>
        <div className="form-row">
          <div className="field">
            <label htmlFor="webinar-visibility">Attendee visibility</label>
            <select id="webinar-visibility" name="visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as WebinarVisibility)}>
              <option value="public">Public — listed in the catalog</option>
              <option value="private">Private — invitation required</option>
            </select>
            <small>Private sessions stay out of the public catalog and sitemap.</small>
          </div>
          <div className="field">
            <label htmlFor="webinar-status">Publishing state</label>
            <select id="webinar-status" name="status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <h2 style={{ marginTop: 12 }}>Primary seat tier</h2>
        <div className="form-row">
          <div className="field">
            <label htmlFor="tier-name">Tier name</label>
            <input id="tier-name" name="tierName" autoComplete="off" value={tierName} onChange={(event) => setTierName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="tier-capacity">Capacity</label>
            <input id="tier-capacity" name="capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pricing-model">Pricing method</label>
          <select id="pricing-model" name="pricingModel" value={pricingModel} onChange={(event) => setPricingModel(event.target.value as PricingModel)}>
            <option value="fixed_per_seat">Fixed price per seat</option>
            <option value="split_total_value">Split total item value across seats</option>
          </select>
        </div>
        {pricingModel === "fixed_per_seat" ? (
          <div className="field">
            <label htmlFor="tier-price">Price per seat (USD)</label>
            <input id="tier-price" name="price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
          </div>
        ) : (
          <div className="form-row">
            <div className="field">
              <label htmlFor="item-value">Total item value (USD)</label>
              <input id="item-value" name="itemValue" type="number" min="0" step="0.01" value={itemValue} onChange={(event) => setItemValue(event.target.value)} required />
              <small>The reference value that will be divided across the available seats.</small>
            </div>
            <div className="field">
              <label htmlFor="rounding-mode">Seat-price rounding</label>
              <select id="rounding-mode" name="roundingMode" value={roundingMode} onChange={(event) => setRoundingMode(event.target.value as PricingRounding)}>
                <option value="exact_cents">Use calculated cents</option>
                <option value="nearest_dollar">Round to nearest whole dollar</option>
                <option value="round_up_dollar">Round up to next whole dollar</option>
              </select>
            </div>
          </div>
        )}
        <div className="pricing-preview" aria-live="polite">
          <div><span className="eyebrow">Pricing preview</span><strong>{formatMoney(pricingPreview.priceCents)} per seat</strong></div>
          <div><span>Projected gross</span><strong>{formatMoney(pricingPreview.projectedGrossCents)}</strong></div>
          {pricingPreview.upliftCents !== null ? <div><span>Rounding uplift</span><strong>{formatMoney(pricingPreview.upliftCents)}</strong></div> : null}
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <Link href="/admin/webinars" className="button button-secondary">Cancel</Link>
        <button className="button" type="submit" disabled={saving}><CalendarPlus size={15} />{saving ? "Creating…" : "Create webinar"}<ArrowRight size={14} /></button>
      </div>
    </form>
  );
}
