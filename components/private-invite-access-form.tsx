"use client";

import { KeyRound, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PrivateInviteAccessForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/private-webinars/${encodeURIComponent(slug)}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "The invitation details could not be verified.");
      router.replace(`/private-webinars/${encodeURIComponent(slug)}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation details could not be verified.");
      setSubmitting(false);
    }
  }

  return (
    <section className="registration-card private-access-card" aria-label="Private webinar access">
      <div className="empty-icon"><LockKeyhole size={20} /></div>
      <span className="eyebrow">Invitation required</span>
      <h2>Enter your access details</h2>
      <p>Use the email address that received the invitation and its one-time access code.</p>
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="private-access-email">Invited email</label>
          <input id="private-access-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="private-access-code">Access code</label>
          <input id="private-access-code" name="code" autoComplete="one-time-code" inputMode="text" required value={code} onChange={(event) => setCode(event.target.value)} placeholder="ABCD-2345" />
          <small>Codes are not case-sensitive. Keep yours private.</small>
        </div>
        <button className="button" type="submit" disabled={submitting}><KeyRound size={15} />{submitting ? "Checking…" : "Open private webinar"}</button>
      </form>
      {message ? <p className="form-error" role="alert">{message}</p> : null}
    </section>
  );
}
