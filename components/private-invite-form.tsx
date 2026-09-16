"use client";

import { Copy, MailPlus, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WebinarInviteView } from "@/lib/types";

type GeneratedInvite = { email: string; code: string; expiresAt: string; webinarSlug: string };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function PrivateInviteForm({ webinarId, slug, initialInvites }: { webinarId: string; slug: string; initialInvites: WebinarInviteView[] }) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [generated, setGenerated] = useState<GeneratedInvite[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState("");

  async function createInvites(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setGenerated([]);
    try {
      const payload: { emails: string; expiresAt?: string } = { emails };
      if (expiresAt) payload.expiresAt = new Date(`${expiresAt}T23:59:59`).toISOString();
      const response = await fetch(`/api/admin/webinars/${encodeURIComponent(webinarId)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { invites?: GeneratedInvite[]; error?: string };
      if (!response.ok || !data.invites) throw new Error(data.error ?? "The invitations could not be created.");
      setGenerated(data.invites);
      setEmails("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitations could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setRevokingId(inviteId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/webinar-invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "The invitation could not be revoked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be revoked.");
    } finally {
      setRevokingId("");
    }
  }

  return (
    <div className="private-invite-manager">
      <form className="form-grid" onSubmit={createInvites}>
        <div className="field">
          <label htmlFor={`invite-emails-${slug}`}>Attendee emails</label>
          <textarea id={`invite-emails-${slug}`} value={emails} onChange={(event) => setEmails(event.target.value)} placeholder={"one@example.com\ntwo@example.com"} required />
          <small>Paste one address per line, or separate addresses with commas. Up to 500 invitations.</small>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor={`invite-expiry-${slug}`}>Expires on</label>
            <input id={`invite-expiry-${slug}`} type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            <small>Defaults to 30 days from generation.</small>
          </div>
          <div className="form-actions private-invite-actions">
            <button className="button" type="submit" disabled={submitting}><MailPlus size={15} />{submitting ? "Generating…" : "Generate invite codes"}</button>
          </div>
        </div>
      </form>

      {message ? <p className="form-error" role="alert">{message}</p> : null}

      {generated.length > 0 ? <section className="generated-invites" aria-live="polite">
        <div className="notice-banner"><ShieldCheck size={16} /><span><strong>Codes generated.</strong> Copy each code into the invitation you send. They are displayed only in this admin response.</span></div>
        <div className="invite-code-list">
          {generated.map((invite) => <article className="invite-code-card" key={`${invite.email}-${invite.code}`}><div><strong>{invite.email}</strong><small>Access page: /private-webinars/{invite.webinarSlug} · Expires {formatDate(invite.expiresAt)}</small></div><code>{invite.code}</code><button className="icon-button" type="button" aria-label={`Copy invite code for ${invite.email}`} title="Copy code" onClick={() => void navigator.clipboard?.writeText(invite.code)}><Copy size={14} /></button></article>)}
        </div>
      </section> : null}

      <div className="invite-table-wrap">
        {initialInvites.length > 0 ? <table className="data-table invite-table"><thead><tr><th>Invited email</th><th>Expires</th><th>Activity</th><th /></tr></thead><tbody>{initialInvites.map((invite) => <tr key={invite.id}><td>{invite.email}</td><td className="muted">{formatDate(invite.expiresAt)}</td><td className="muted">{invite.revokedAt ? "Revoked" : invite.redeemedAt ? "Redeemed" : invite.lastVerifiedAt ? "Verified" : "Not used"}</td><td><button className="text-button danger-button" type="button" disabled={Boolean(invite.revokedAt) || revokingId === invite.id} onClick={() => void revokeInvite(invite.id)}>{revokingId === invite.id ? "Revoking…" : invite.revokedAt ? "Revoked" : <><XCircle size={13} /> Revoke</>}</button></td></tr>)}</tbody></table> : <p className="muted private-empty-copy">No invitations have been generated for this webinar yet.</p>}
      </div>
    </div>
  );
}
