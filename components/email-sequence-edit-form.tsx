"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EmailSequenceView } from "@/lib/types";

export function EmailSequenceEditForm({ sequence }: { sequence: EmailSequenceView }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: sequence.name, triggerKey: sequence.triggerKey, status: sequence.status });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/email/sequences/${encodeURIComponent(sequence.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The sequence could not be updated.");
      setMessage("Sequence updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sequence could not be updated.");
    } finally {
      setSaving(false);
    }
  }
  return <details className="email-template-editor"><summary>Edit sequence</summary><form className="form-grid" onSubmit={submit}><div className="form-row"><div className="field"><label htmlFor={`sequence-name-${sequence.id}`}>Name</label><input id={`sequence-name-${sequence.id}`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div><div className="field"><label htmlFor={`sequence-trigger-${sequence.id}`}>Trigger key</label><input id={`sequence-trigger-${sequence.id}`} value={form.triggerKey} onChange={(event) => setForm({ ...form, triggerKey: event.target.value })} required /></div></div><div className="field"><label htmlFor={`sequence-status-${sequence.id}`}>Status</label><select id={`sequence-status-${sequence.id}`} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></div><div className="form-actions"><button className="button button-small" type="submit" disabled={saving}><Save size={13} />{saving ? "Saving…" : "Save changes"}</button>{message ? <span className={message === "Sequence updated." ? "form-success" : "form-error"}>{message}</span> : null}</div></form></details>;
}
