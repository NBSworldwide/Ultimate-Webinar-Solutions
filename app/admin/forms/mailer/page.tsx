import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormMailerSettingsForm } from "@/components/form-mailer-settings";
import { getFormMailerSettings } from "@/lib/forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Form mailer", robots: { index: false, follow: false } };

export default async function FormMailerPage() {
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Forms</span><h1 className="page-title">Mailer settings.</h1><p className="page-subtitle">Configure provider-neutral sender defaults and encrypted credentials for a future delivery adapter.</p></div><Link href="/admin/forms" className="button button-secondary"><ArrowLeft size={14} /> Forms</Link></div><FormMailerSettingsForm initialSettings={await getFormMailerSettings()} /></div>;
}
