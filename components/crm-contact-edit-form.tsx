"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CrmContactView } from "@/lib/types";

export function CrmContactEditForm({ contact }: { contact: CrmContactView }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: contact.name,
    phone: contact.phone,
    company: contact.company,
    lifecycleStage: contact.lifecycleStage,
    marketingConsent: contact.marketingConsent,
    unsubscribed: Boolean(contact.unsubscribedAt),
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/crm/contacts/${encodeURIComponent(contact.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The contact could not be updated.");
      setMessage("Contact updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The contact could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="email-template-editor crm-contact-editor">
      <summary>Edit contact details</summary>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-row">
          <div className="field"><label htmlFor={`crm-edit-name-${contact.id}`}>Name</label><input id={`crm-edit-name-${contact.id}`} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
          <div className="field"><label htmlFor={`crm-edit-phone-${contact.id}`}>Phone</label><input id={`crm-edit-phone-${contact.id}`} type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label htmlFor={`crm-edit-company-${contact.id}`}>Company</label><input id={`crm-edit-company-${contact.id}`} autoComplete="organization" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></div>
          <div className="field"><label htmlFor={`crm-edit-stage-${contact.id}`}>Lifecycle stage</label><select id={`crm-edit-stage-${contact.id}`} value={form.lifecycleStage} onChange={(event) => setForm({ ...form, lifecycleStage: event.target.value as typeof form.lifecycleStage })}><option value="lead">Lead</option><option value="attendee">Attendee</option><option value="customer">Customer</option><option value="inactive">Inactive</option></select></div>
        </div>
        <div className="form-row">
          <label className="check-field"><input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })} /><span>Marketing consent recorded</span></label>
          <label className="check-field"><input type="checkbox" checked={form.unsubscribed} onChange={(event) => setForm({ ...form, unsubscribed: event.target.checked })} /><span>Suppress marketing email</span></label>
        </div>
        <div className="form-actions"><button className="button button-small" type="submit" disabled={saving}><Save size={13} />{saving ? "Saving…" : "Save contact"}</button>{message ? <span className={message === "Contact updated." ? "form-success" : "form-error"} role="status">{message}</span> : null}</div>
      </form>
    </details>
  );
}
