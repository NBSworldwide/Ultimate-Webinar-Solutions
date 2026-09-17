"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function SignupForm({ settings, returnTo = "/account" }: { settings: SiteSettings; returnTo?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, returnTo }) });
      const data = await response.json() as { redirectTo?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "The customer account could not be created.");
      window.location.href = data.redirectTo ?? returnTo;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The customer account could not be created.");
      setLoading(false);
    }
  }

  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={31} height={31} /> : <Sparkles size={18} />}</div><h1>Create your account.</h1><p>Create a customer account before reserving a seat. Your session registrations and product orders will stay together in your account portal.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="signup-name">Full name</label><input id="signup-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="field"><label htmlFor="signup-email">Email</label><input id="signup-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="signup-password">Password</label><input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><small className="field-help">Use at least 12 characters.</small></div><div className="field"><label htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div><button className="button" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create customer account"}<UserRoundPlus size={15} /></button></form>{error ? <p className="form-error" role="alert">{error}</p> : null}<p className="auth-switch">Already have an account? <Link href={loginHref}>Sign in</Link></p><Link className="panel-link" href="/webinars" style={{ display: "inline-flex", marginTop: 19 }}><LockKeyhole size={13} /> Browse public sessions</Link></main></div>;
}
