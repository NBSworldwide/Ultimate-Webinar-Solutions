import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, KeyRound, Sparkles, XCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Password change", robots: { index: false, follow: false } };

export default async function PasswordChangeCompletePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status === "success" ? "success" : "error";
  const settings = await getSiteSettings();
  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={31} height={31} /> : <Sparkles size={18} />}</div>{status === "success" ? <><h1>Password changed.</h1><p className="form-success" role="status"><CheckCircle2 size={15} />Your password was changed and existing sessions were closed. Sign in again with the new password.</p></> : <><h1>That link is no longer valid.</h1><p className="form-error" role="alert"><XCircle size={15} />The authorization link may have expired, already been used, or been cancelled. Start a new request from your account.</p></>}<Link className="button" href="/login">Return to sign in <KeyRound size={15} /></Link></main></div>;
}
