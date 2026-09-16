"use client";

import { useState } from "react";
import { ArrowRight, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function WebinarForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("Live session");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("75");
  const [hostName, setHostName] = useState("");
  const [tierName, setTierName] = useState("Standard seat");
  const [price, setPrice] = useState("49");
  const [capacity, setCapacity] = useState("20");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/webinars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, eyebrow, description, startsAt, durationMinutes: Number(durationMinutes), hostName, tierName, priceCents: Math.round(Number(price) * 100), capacity: Number(capacity), status }) });
      const data = await response.json() as { webinar?: { id: string }; error?: string };
      if (!response.ok || !data.webinar) throw new Error(data.error ?? "The webinar could not be created.");
      router.push(`/admin/webinars/${data.webinar.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The webinar could not be created.");
      setSaving(false);
    }
  }

  return <form className="admin-form-card" onSubmit={submit}><h2>Session details</h2><div className="form-grid"><div className="field"><label htmlFor="webinar-title">Title</label><input id="webinar-title" name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The next practical leadership lab" required /></div><div className="form-row"><div className="field"><label htmlFor="webinar-eyebrow">Label</label><input id="webinar-eyebrow" name="eyebrow" autoComplete="off" value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} required /></div><div className="field"><label htmlFor="webinar-host">Host</label><input id="webinar-host" name="hostName" autoComplete="name" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Maya Chen" required /></div></div><div className="field"><label htmlFor="webinar-description">Description</label><textarea id="webinar-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will attendees be able to do after this session?" required /></div><div className="form-row"><div className="field"><label htmlFor="webinar-start">Start time</label><input id="webinar-start" name="startsAt" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></div><div className="field"><label htmlFor="webinar-duration">Duration (minutes)</label><input id="webinar-duration" name="durationMinutes" type="number" min="15" max="480" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required /></div></div><h2 style={{ marginTop: 12 }}>Primary seat tier</h2><div className="form-row"><div className="field"><label htmlFor="tier-name">Tier name</label><input id="tier-name" name="tierName" autoComplete="off" value={tierName} onChange={(event) => setTierName(event.target.value)} required /></div><div className="field"><label htmlFor="tier-price">Price (USD)</label><input id="tier-price" name="price" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required /></div></div><div className="form-row"><div className="field"><label htmlFor="tier-capacity">Capacity</label><input id="tier-capacity" name="capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} required /></div><div className="field"><label htmlFor="webinar-status">Publishing state</label><select id="webinar-status" name="status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}><option value="draft">Draft</option><option value="published">Published</option></select></div></div></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="form-actions"><Link href="/admin/webinars" className="button button-secondary">Cancel</Link><button className="button" type="submit" disabled={saving}><CalendarPlus size={15} />{saving ? "Creating…" : "Create webinar"}<ArrowRight size={14} /></button></div></form>;
}
