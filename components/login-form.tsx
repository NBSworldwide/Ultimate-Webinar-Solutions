"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json() as { redirectTo?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Sign in failed.");
      window.location.href = data.redirectTo ?? "/admin";
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark"><Sparkles size={18} /></div><h1>Welcome back.</h1><p>Sign in to the standalone Webinar Studio workspace with the account created by your workspace administrator.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><button className="button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}<ArrowRight size={15} /></button></form>{error ? <p className="form-error" role="alert">{error}</p> : null}<Link className="panel-link" href="/webinars" style={{ display: "inline-flex", marginTop: 19 }}><LockKeyhole size={13} /> Browse public sessions</Link></main></div>;
}
