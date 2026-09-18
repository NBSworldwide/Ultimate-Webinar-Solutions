"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/password-field";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/password/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, confirmPassword }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "The password change request could not be created.");
      setPassword("");
      setConfirmPassword("");
      setMessage(data.message ?? "Check your email for the authorization link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The password change request could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="account-security-card panel">
    <div className="panel-header"><div><span className="eyebrow">Account security</span><h2 className="panel-title">Change password</h2><span className="row-meta">Your password changes only after you authorize the request from your email.</span></div><KeyRound size={17} color="#0f776e" /></div>
    <form className="form-grid" onSubmit={submit}>
      <PasswordField id="account-new-password" name="password" label="New password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} helpText="Use at least 12 characters." required />
      <PasswordField id="account-confirm-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      {message ? <p className={message.startsWith("Check") ? "form-success" : "form-error"} role="status">{message}</p> : null}
      <button className="button" type="submit" disabled={saving}><KeyRound size={15} />{saving ? "Sending…" : "Email authorization link"}</button>
    </form>
  </section>;
}
