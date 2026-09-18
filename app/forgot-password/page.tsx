import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recover your account", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm settings={await getSiteSettings()} />;
}
