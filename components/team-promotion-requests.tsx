"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { TeamRoleChangeRequestView } from "@/lib/types";

export function TeamPromotionRequests({ requests }: { requests: TeamRoleChangeRequestView[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function review(requestId: string, decision: "approve" | "deny") {
    setBusyId(requestId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/team/requests/${encodeURIComponent(requestId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reviewNote: notes[requestId] ?? "" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The promotion decision could not be saved.");
      setMessage(decision === "approve" ? "Promotion approved and notifications queued." : "Promotion denied and notifications queued.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The promotion decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Pending manager approvals <span className="muted">({requests.length})</span></h2><span className="row-meta">Only the Administrator of Record can approve or deny these requests.</span></div><Check size={17} color="#0f776e" /></div>{requests.length === 0 ? <div className="empty-state"><h3>No pending requests</h3><p>Customer promotions will appear here after a Manager or Administrator requests them.</p></div> : <div className="form-grid">{requests.map((request) => <article className="account-card" key={request.id}><div className="page-topline"><div><span className="eyebrow">Customer → Manager</span><h3>{request.targetName}</h3><p className="row-meta">@{request.targetUsername} · {request.targetEmail}</p></div><span className="status-badge status-queued"><span className="status-dot" />Pending</span></div><p className="field-help">Requested by {request.requestedByName} ({request.requestedByEmail}) on {formatDateTime(request.createdAt)}.</p><div className="field"><label htmlFor={`promotion-note-${request.id}`}>Review note <span className="muted">(optional)</span></label><textarea id={`promotion-note-${request.id}`} rows={2} maxLength={1000} value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Add context for the people notified about this decision." /></div><div className="button-row"><button className="button button-small" type="button" onClick={() => void review(request.id, "approve")} disabled={busyId === request.id}><Check size={14} />{busyId === request.id ? "Saving…" : "Approve promotion"}</button><button className="button button-small button-secondary" type="button" onClick={() => void review(request.id, "deny")} disabled={busyId === request.id}><X size={14} />Deny promotion</button></div></article>)}</div>}{message ? <p className={message.includes("queued") ? "form-success" : "form-error"} role="status">{message}</p> : null}</section>;
}
