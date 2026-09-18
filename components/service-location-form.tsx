"use client";

import { ArrowLeft, MapPin, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ManagedServiceLocation } from "@/lib/service-locations";

type ServiceLocationFormState = {
  slug: string;
  city: string;
  region: string;
  timezone: string;
  accent: ManagedServiceLocation["accent"];
  eyebrow: string;
  title: string;
  summary: string;
  description: string;
  bestFor: string;
  deliveryModes: string;
  faqs: string;
  status: ManagedServiceLocation["pageStatus"];
};

function initialState(location?: ManagedServiceLocation): ServiceLocationFormState {
  return {
    slug: location?.slug ?? "",
    city: location?.city ?? "",
    region: location?.region ?? "",
    timezone: location?.timezone ?? "America/Chicago",
    accent: location?.accent ?? "teal",
    eyebrow: location?.eyebrow ?? "Sample coverage",
    title: location?.title ?? "",
    summary: location?.summary ?? "",
    description: location?.description ?? "",
    bestFor: location?.bestFor.join("\n") ?? "",
    deliveryModes: location?.deliveryModes.join("\n") ?? "",
    faqs: location?.faqs.map((faq) => `${faq.question} | ${faq.answer}`).join("\n") ?? "",
    status: location?.pageStatus ?? "draft",
  };
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function faqs(value: string): Array<{ question: string; answer: string }> {
  return lines(value).flatMap((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) return [];
    const question = line.slice(0, separator).trim();
    const answer = line.slice(separator + 1).trim();
    return question && answer ? [{ question, answer }] : [];
  });
}

export function ServiceLocationForm({ location }: { location?: ManagedServiceLocation }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(location));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isEditing = Boolean(location);

  function update<K extends keyof ServiceLocationFormState>(key: K, value: ServiceLocationFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      slug: form.slug,
      city: form.city,
      region: form.region,
      timezone: form.timezone,
      accent: form.accent,
      eyebrow: form.eyebrow,
      title: form.title,
      summary: form.summary,
      description: form.description,
      bestFor: lines(form.bestFor),
      deliveryModes: lines(form.deliveryModes),
      faqs: faqs(form.faqs),
      status: form.status,
    };
    try {
      const endpoint = isEditing ? `/api/admin/service-locations/${encodeURIComponent(location!.id)}` : "/api/admin/service-locations";
      const response = await fetch(endpoint, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { location?: ManagedServiceLocation; error?: string };
      if (!response.ok || !data.location) throw new Error(data.error ?? "The service location could not be saved.");
      if (!isEditing) router.push(`/admin/locations/${data.location.id}/edit`);
      else {
        setMessage("Service location saved and its page refreshed.");
        router.refresh();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The service location could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="admin-form-card service-location-form" onSubmit={submit}>
    <div className="panel-header"><div><span className="eyebrow">{isEditing ? "Edit managed record" : "New managed record"}</span><h2>{isEditing ? location?.city : "Add a service location"}</h2><p className="form-help">This record creates or updates a public page from the reusable service-location template. Use the Pages editor to control the template block’s placement and styling.</p></div><MapPin size={19} color="#0f776e" /></div>
    <section className="settings-form-section" aria-labelledby="service-location-identity-title">
      <h3 id="service-location-identity-title">Page identity</h3>
      <div className="form-row"><div className="field"><label htmlFor="location-slug">URL slug</label><input id="location-slug" value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="chicago-il" required /><small>Public page: /locations/{form.slug || "your-location"}</small></div><div className="field"><label htmlFor="location-status">Publishing state</label><select id="location-status" value={form.status} onChange={(event) => update("status", event.target.value as ServiceLocationFormState["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div></div>
      <div className="form-row"><div className="field"><label htmlFor="location-city">City</label><input id="location-city" value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Chicago" required /></div><div className="field"><label htmlFor="location-region">State or region</label><input id="location-region" value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="Illinois" required /></div></div>
      <div className="form-row"><div className="field"><label htmlFor="location-timezone">Timezone label</label><input id="location-timezone" value={form.timezone} onChange={(event) => update("timezone", event.target.value)} placeholder="Central Time" required /></div><div className="field"><label htmlFor="location-accent">Accent</label><select id="location-accent" value={form.accent} onChange={(event) => update("accent", event.target.value as ServiceLocationFormState["accent"])}><option value="teal">Teal</option><option value="coral">Coral</option><option value="gold">Gold</option></select></div></div>
    </section>
    <section className="settings-form-section" aria-labelledby="service-location-copy-title">
      <h3 id="service-location-copy-title">Public copy</h3>
      <div className="field"><label htmlFor="location-eyebrow">Eyebrow</label><input id="location-eyebrow" value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} placeholder="Sample coverage · Central Time" /></div>
      <div className="field"><label htmlFor="location-title">Page title</label><input id="location-title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Webinar operations support for Chicago teams" required /></div>
      <div className="field"><label htmlFor="location-summary">Summary</label><textarea id="location-summary" rows={3} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="A short summary used in cards, metadata, and related links." required /></div>
      <div className="field"><label htmlFor="location-description">Description</label><textarea id="location-description" rows={6} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the service-area experience and its boundaries." required /></div>
    </section>
    <section className="settings-form-section" aria-labelledby="service-location-details-title">
      <h3 id="service-location-details-title">Template details</h3>
      <div className="form-row"><div className="field"><label htmlFor="location-best-for">Good fit for</label><textarea id="location-best-for" rows={6} value={form.bestFor} onChange={(event) => update("bestFor", event.target.value)} placeholder="Leadership briefings\nLearning labs\nOperating reviews" required /><small>One use case per line.</small></div><div className="field"><label htmlFor="location-delivery-modes">Delivery modes</label><textarea id="location-delivery-modes" rows={6} value={form.deliveryModes} onChange={(event) => update("deliveryModes", event.target.value)} placeholder="Virtual room setup\nLive facilitation support\nReplay handoff" required /><small>One format per line.</small></div></div>
      <div className="field"><label htmlFor="location-faqs">FAQs</label><textarea id="location-faqs" rows={7} value={form.faqs} onChange={(event) => update("faqs", event.target.value)} placeholder="Is this an in-person venue? | No. This is a virtual-first example.\nCan teams work across time zones? | Yes. The session keeps a clear timezone label." /><small>One question and answer per line, separated by a vertical bar: Question | Answer.</small></div>
    </section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
    <div className="form-actions"><Link href="/admin/locations" className="button button-secondary"><ArrowLeft size={14} /> Back to locations</Link><button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : isEditing ? "Save location" : "Create location"}</button></div>
  </form>;
}
