"use client";

import { UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamMemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The manager account could not be created.");
      setName("");
      setEmail("");
      setPassword("");
      setMessage("Manager account created.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The manager account could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card" onSubmit={submit}>
      <h2>Create a manager</h2>
      <p className="field-help">Managers can manage sessions, products, orders, registrations, page content, automated customer emails, and visual template appearance. They cannot change company settings, integrations, team access, or provider credentials.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="team-member-name">Full name</label><input id="team-member-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div className="field"><label htmlFor="team-member-email">Email</label><input id="team-member-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="field"><label htmlFor="team-member-password">Temporary password</label><input id="team-member-password" type="password" autoComplete="new-password" minLength={20} value={password} onChange={(event) => setPassword(event.target.value)} required /><small className="field-help">Use at least 20 characters and share it through a secure channel.</small></div>
      </div>
      {message ? <p className={message === "Manager account created." ? "form-success" : "form-error"} role={message === "Manager account created." ? "status" : "alert"}>{message}</p> : null}
      <button className="button" type="submit" disabled={saving}><UserRoundPlus size={15} />{saving ? "Creating…" : "Create manager account"}</button>
    </form>
  );
}
