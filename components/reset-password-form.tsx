"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/password-field";
import type { SiteSettings } from "@/lib/types";

export function ResetPasswordForm({ token, settings }: { token: string; settings: SiteSettings }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "This password reset link is invalid or has expired.");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "The password reset could not be completed.");
      setPassword("");
      setConfirmPassword("");
      setMessage(data.message ?? "Your password was reset successfully.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The password reset could not be completed.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={31} height={31} /> : <Sparkles size={18} />}</div><h1>Choose a new password.</h1><p>This one-time link can be used only once and expires shortly after it is issued.</p>{message ? <><p className="form-success" role="status"><CheckCircle2 size={15} />{message}</p><Link className="button" href="/login" style={{ marginTop: 14 }}>Return to sign in <KeyRound size={15} /></Link></> : <form className="form-grid" onSubmit={submit}><PasswordField id="reset-password" name="password" label="New password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} helpText="Use at least 12 characters." required /><PasswordField id="reset-confirm-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><button className="button" type="submit" disabled={saving || !token}><KeyRound size={15} />{saving ? "Saving…" : "Reset password"}</button></form>}{error ? <p className="form-error" role="alert">{error}</p> : null}<p className="auth-switch"><Link href="/login">Return to sign in</Link></p></main></div>;
}
