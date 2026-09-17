"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import type { PricingModel, PricingRounding, ProductListItem, WebinarDetails, WebinarVisibility } from "@/lib/types";
import type { WebinarTemplate } from "@/lib/playbooks";

function centsFromDollars(value: string): number {
  const dollars = Number(value);
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : 0;
}

function localDateTimeValue(value: string, timezone: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function zonedDateTimeToIso(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid start time.");
  const wallClock = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = wallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate)).reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
    const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const corrected = candidate + (wallClock - observed);
    if (corrected === candidate) return new Date(candidate).toISOString();
    candidate = corrected;
  }
  return new Date(candidate).toISOString();
}

export function WebinarForm({ webinar, template, products = [], defaultTimezone = "America/Chicago" }: { webinar?: WebinarDetails; template?: WebinarTemplate; products?: Array<ProductListItem & { details?: string }>; defaultTimezone?: string }) {
  const primaryTier = webinar?.tiers[0];
  const router = useRouter();
  const [title, setTitle] = useState(webinar?.title ?? (template ? `${template.name} — new webinar` : ""));
  const [eyebrow, setEyebrow] = useState(webinar?.eyebrow ?? template?.format ?? "Live session");
  const [description, setDescription] = useState(webinar?.description ?? template?.description ?? "");
  const [startsAt, setStartsAt] = useState(webinar ? localDateTimeValue(webinar.startsAt, webinar.timezone) : "");
  const [durationMinutes, setDurationMinutes] = useState(String(webinar?.durationMinutes ?? template?.durationMinutes ?? 75));
  const [timezone, setTimezone] = useState(webinar?.timezone ?? defaultTimezone);
  const [hostName, setHostName] = useState(webinar?.hostName ?? "");
  const [tierName, setTierName] = useState(primaryTier?.name ?? "Standard seat");
  const [price, setPrice] = useState(primaryTier ? (primaryTier.priceCents / 100).toFixed(2) : "49.00");
  const [itemValue, setItemValue] = useState(primaryTier?.referenceValueCents ? (primaryTier.referenceValueCents / 100).toFixed(2) : "450.00");
  const [capacity, setCapacity] = useState(String(primaryTier?.capacity ?? template?.capacity ?? 20));
  const [status, setStatus] = useState<"draft" | "published">(webinar?.status === "published" ? "published" : "draft");
  const [visibility, setVisibility] = useState<WebinarVisibility>(webinar?.visibility ?? "public");
  const [giveawayEnabled, setGiveawayEnabled] = useState(Boolean(webinar?.giveawayEnabled));
  const [prizeProductId, setPrizeProductId] = useState(webinar?.prizeProductId ?? "");
  const [claimDeadline, setClaimDeadline] = useState(webinar?.claimDeadline ? localDateTimeValue(webinar.claimDeadline, webinar.timezone) : "");
  const [fulfillmentNotes, setFulfillmentNotes] = useState(webinar?.fulfillmentNotes ?? "");
  const [registrationType, setRegistrationType] = useState<"paid" | "free">(primaryTier?.priceCents === 0 ? "free" : "paid");
  const [pricingModel, setPricingModel] = useState<PricingModel>(primaryTier?.pricingModel ?? "fixed_per_seat");
  const [roundingMode, setRoundingMode] = useState<PricingRounding>(primaryTier?.roundingMode ?? "exact_cents");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pricingPreview = useMemo(() => {
    const capacityValue = Math.max(1, Number(capacity) || 1);
    const referenceValueCents = centsFromDollars(itemValue);
    const fixedPriceCents = centsFromDollars(price);
    if (registrationType === "free") {
      return { priceCents: 0, referenceValueCents: null, projectedGrossCents: 0, upliftCents: null };
    }
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
  }, [capacity, itemValue, price, pricingModel, registrationType, roundingMode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const selectedTimezone = timezone || defaultTimezone || "America/Chicago";
      const startsAtIso = zonedDateTimeToIso(startsAt, selectedTimezone);
      const response = await fetch(webinar ? `/api/admin/webinars/${encodeURIComponent(webinar.id)}` : "/api/admin/webinars", {
        method: webinar ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eyebrow,
          description,
          startsAt: startsAtIso,
          timezone: selectedTimezone,
          durationMinutes: Number(durationMinutes),
          hostName,
          tierName,
          priceCents: pricingPreview.priceCents,
          capacity: Number(capacity),
          status,
          visibility,
          pricingModel: registrationType === "free" ? "fixed_per_seat" : pricingModel,
          referenceValueCents: registrationType === "free" ? null : pricingPreview.referenceValueCents,
          roundingMode: registrationType === "free" ? "exact_cents" : roundingMode,
          giveawayEnabled,
          prizeProductId: giveawayEnabled ? prizeProductId || null : null,
          claimDeadline: giveawayEnabled && claimDeadline ? zonedDateTimeToIso(claimDeadline, selectedTimezone) : null,
          fulfillmentNotes: giveawayEnabled ? fulfillmentNotes : "",
        }),
      });
      const data = await response.json() as { webinar?: { id: string }; error?: string };
      if (!response.ok || !data.webinar) throw new Error(data.error ?? `The webinar could not be ${webinar ? "updated" : "created"}.`);
      router.push(`/admin/webinars/${data.webinar.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `The webinar could not be ${webinar ? "updated" : "created"}.`);
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card" onSubmit={submit}>
      <h2>{webinar ? "Edit webinar details" : "Session details"}</h2>
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
        <div className="field">
          <label htmlFor="webinar-timezone">Session time zone</label>
          <input id="webinar-timezone" name="timezone" list="webinar-timezone-options" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/Chicago" required />
          <datalist id="webinar-timezone-options">
            <option value="America/Los_Angeles" />
            <option value="America/Denver" />
            <option value="America/Chicago" />
            <option value="America/New_York" />
            <option value="UTC" />
          </datalist>
          <small>Defaults to the site time zone from Settings. Use an IANA value such as America/Chicago.</small>
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

        <h2 style={{ marginTop: 12 }}>Giveaway and prize</h2>
        <div className="field">
          <label className="check-field" htmlFor="webinar-giveaway-enabled">
            <input id="webinar-giveaway-enabled" type="checkbox" checked={giveawayEnabled} onChange={(event) => setGiveawayEnabled(event.target.checked)} />
            <span>Attach one catalog product as the session giveaway prize</span>
          </label>
          <small>The raffle will use eligible seats from this session. The prize details are saved with the session so later catalog edits do not change the configured giveaway.</small>
        </div>
        {giveawayEnabled ? <>
          <div className="form-row">
            <div className="field">
              <label htmlFor="webinar-prize-product">Prize product</label>
              <select id="webinar-prize-product" value={prizeProductId} onChange={(event) => setPrizeProductId(event.target.value)} required={giveawayEnabled}>
                <option value="">Choose one product</option>
                {products.filter((product) => product.status === "active" || product.id === prizeProductId).map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}
              </select>
              <small>Only one prize is supported per session in this release.</small>
            </div>
            <div className="field">
              <label htmlFor="webinar-claim-deadline">Winner claim deadline</label>
              <input id="webinar-claim-deadline" type="datetime-local" value={claimDeadline} onChange={(event) => setClaimDeadline(event.target.value)} required={giveawayEnabled} />
              <small>Use the session time zone shown above.</small>
            </div>
          </div>
          <div className="field">
            <label htmlFor="webinar-fulfillment-notes">Fulfillment notes</label>
            <textarea id="webinar-fulfillment-notes" rows={4} value={fulfillmentNotes} onChange={(event) => setFulfillmentNotes(event.target.value)} placeholder="How the winner should claim the prize, shipping steps, contact details, or pickup instructions." required={giveawayEnabled} />
          </div>
        </> : null}

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
          <label htmlFor="registration-type">Registration price</label>
          <label className="check-field" htmlFor="registration-type">
            <input id="registration-type" name="registrationType" type="checkbox" checked={registrationType === "free"} onChange={(event) => setRegistrationType(event.target.checked ? "free" : "paid")} />
            <span>Free webinar — no payment required</span>
          </label>
          <small>{registrationType === "free" && visibility === "private" ? "Private free webinars still require an invitation code." : registrationType === "free" ? "Free webinars remain available in the public catalog when published." : "Leave unchecked to use the paid seat-pricing controls below."}</small>
        </div>
        {registrationType === "paid" ? <div className="field">
          <label htmlFor="pricing-model">Pricing method</label>
          <select id="pricing-model" name="pricingModel" value={pricingModel} onChange={(event) => setPricingModel(event.target.value as PricingModel)}>
            <option value="fixed_per_seat">Fixed price per seat</option>
            <option value="split_total_value">Split total item value across seats</option>
          </select>
        </div> : null}
        {registrationType === "paid" && pricingModel === "fixed_per_seat" ? (
          <div className="field">
            <label htmlFor="tier-price">Price per seat (USD)</label>
            <input id="tier-price" name="price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
          </div>
        ) : registrationType === "paid" ? (
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
        ) : null}
        <div className="pricing-preview" aria-live="polite">
          <div><span className="eyebrow">Pricing preview</span><strong>{registrationType === "free" ? "Free registration" : `${formatMoney(pricingPreview.priceCents)} per seat`}</strong></div>
          <div><span>Projected gross</span><strong>{formatMoney(pricingPreview.projectedGrossCents)}</strong></div>
          {pricingPreview.upliftCents !== null ? <div><span>Rounding uplift</span><strong>{formatMoney(pricingPreview.upliftCents)}</strong></div> : null}
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <Link href="/admin/webinars" className="button button-secondary">Cancel</Link>
        <button className="button" type="submit" disabled={saving}><CalendarPlus size={15} />{saving ? webinar ? "Saving…" : "Creating…" : webinar ? "Save changes" : "Create webinar"}<ArrowRight size={14} /></button>
      </div>
    </form>
  );
}
