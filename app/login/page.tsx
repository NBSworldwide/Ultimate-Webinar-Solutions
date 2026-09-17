import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { safeReturnPath } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeReturnPath(typeof params.returnTo === "string" ? params.returnTo : undefined, "/account");
  return <LoginForm settings={await getSiteSettings()} returnTo={returnTo} />;
}
