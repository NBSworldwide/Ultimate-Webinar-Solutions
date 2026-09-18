"use client";

import { useRouter } from "next/navigation";
import { Mail, Save, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEntry, FormEntryDetail } from "@/lib/types";

export function FormEntryActions({ entry, detail = false }: { entry: FormEntry | FormEntryDetail; detail?: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function patch(body: Record<string, unknown>) {
    setWorking(true); setError(""); setMessage("");
    try { const response = await fetch(`/api/admin/forms/entries/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Entry update failed."); router.refresh(); } catch (patchError) { setError(patchError instanceof Error ? patchError.message : "Entry update failed."); } finally { setWorking(false); }
  }
  async function action(actionName: "trash" | "restore" | "resend") {
    setWorking(true); setError(""); setMessage("");
    try { const response = await fetch(`/api/admin/forms/entries/${encodeURIComponent(entry.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) }); const result = await response.json() as { error?: string; result?: { message?: string } }; if (!response.ok) throw new Error(result.error || "Entry action failed."); setMessage(result.result?.message || "Entry updated."); router.refresh(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Entry action failed."); } finally { setWorking(false); }
  }
  return <div className={`entry-actions ${detail ? "entry-actions-detail" : ""}`}><button type="button" className={`icon-button ${entry.isStarred ? "button-active" : ""}`} onClick={() => patch({ isStarred: !entry.isStarred })} disabled={working} aria-label={entry.isStarred ? "Remove star" : "Star entry"} title={entry.isStarred ? "Remove star" : "Star entry"}><Star size={14} fill={entry.isStarred ? "currentColor" : "none"} /></button><button type="button" className="button button-secondary button-small" onClick={() => patch({ isRead: !entry.isRead })} disabled={working}>{entry.isRead ? "Mark unread" : "Mark read"}</button>{detail ? <button type="button" className="button button-secondary button-small" onClick={() => action("resend")} disabled={working}><Mail size={13} /> Queue notifications</button> : null}{entry.trashedAt ? <button type="button" className="button button-secondary button-small" onClick={() => action("restore")} disabled={working}>Restore</button> : <button type="button" className="icon-button icon-button-danger" onClick={() => action("trash")} disabled={working} aria-label="Move entry to trash" title="Move entry to trash"><Trash2 size={14} /></button>}{error ? <span className="form-error entry-action-message">{error}</span> : null}{message ? <span className="form-success entry-action-message">{message}</span> : null}</div>;
}

export function FormEntryDetailEditor({ entry }: { entry: FormEntryDetail }) {
  const router = useRouter();
  const [notes, setNotes] = useState(entry.notes);
  const [paymentStatus, setPaymentStatus] = useState(entry.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save() {
    setSaving(true); setMessage(""); setError("");
    try { const response = await fetch(`/api/admin/forms/entries/${encodeURIComponent(entry.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes, paymentStatus }) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "Entry details could not be saved."); setMessage("Entry details saved."); router.refresh(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Entry details could not be saved."); } finally { setSaving(false); }
  }
  return <section className="panel entry-editor-panel"><div className="panel-header"><div><span className="eyebrow">Operator notes</span><h2 className="panel-title">Entry handling</h2></div></div><div className="form-grid"><div className="field"><label htmlFor="entry-payment-status">Payment status</label><select id="entry-payment-status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as FormEntry["paymentStatus"])}><option value="none">No payment</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></div><div className="field"><label htmlFor="entry-notes">Internal notes</label><textarea id="entry-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} placeholder="Add an internal note for the operations team." /></div><button type="button" className="button button-small" onClick={save} disabled={saving}><Save size={13} />{saving ? "Saving…" : "Save entry details"}</button></div>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section>;
}
