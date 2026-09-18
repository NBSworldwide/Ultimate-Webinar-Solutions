import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailCheck, Sparkles, XCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email address change", robots: { index: false, follow: false } };

export default async function EmailChangeCompletePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status;
  const settings = await getSiteSettings();
  return <div className="login-shell"><main className="login-card" id="main-content"><div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={31} height={31} /> : <Sparkles size={18} />}</div>{status === "complete" ? <><h1>Email address updated.</h1><p className="form-success" role="status"><CheckCircle2 size={15} />Both email addresses were confirmed. Your account now uses the new address, and existing sessions were closed.</p><Link className="button" href="/login">Sign in again <MailCheck size={15} /></Link></> : status === "partial" ? <><h1>One confirmation received.</h1><p className="notice-banner"><MailCheck size={15} />The first link was accepted. Open the other confirmation link from the other inbox to finish changing your email address.</p><Link className="button" href="/account">Return to your account</Link></> : <><h1>That link is no longer valid.</h1><p className="form-error" role="alert"><XCircle size={15} />The email-change link may have expired, already been used, or been cancelled. Start a new request from your account.</p><Link className="button" href="/account">Return to your account</Link></>}</main></div>;
}
