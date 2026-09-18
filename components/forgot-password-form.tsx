"use client";

import Link from "next/link";
import { ArrowRight, MailCheck, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { SiteSettings } from "@/lib/types";

export function ForgotPasswordForm({ settings }: { settings: SiteSettings }) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Password recovery is temporarily unavailable.");
      setMessage(data.message ?? "If an account matches, a reset link is on its way.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Password recovery is temporarily unavailable.");
    } finally {
      setSending(false);
    }
  }

  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={31} height={31} /> : <Sparkles size={18} />}</div><h1>Recover your account.</h1><p>Enter your email address or username and we’ll send a one-time link if an account matches.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="forgot-identifier">Email or username</label><input id="forgot-identifier" type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></div><button className="button" type="submit" disabled={sending}><MailCheck size={15} />{sending ? "Sending…" : "Send reset link"}<ArrowRight size={15} /></button></form>{message ? <p className="form-success" role="status">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<p className="auth-switch"><Link href="/login">Return to sign in</Link></p></main></div>;
}
