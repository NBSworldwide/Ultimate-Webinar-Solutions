import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AppearanceStudio } from "@/components/appearance-studio";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { ThemeSettingsForm } from "@/components/theme-settings-form";
import { getAppearance } from "@/lib/appearance";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { getThemeSettings } from "@/lib/theme-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Appearance", robots: { index: false, follow: false } };

export default async function AppearancePage() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) redirect("/admin");
  const canManageSettings = hasCapability(user, "settings.manage");
  const [appearance, theme, siteSettings] = await Promise.all([getAppearance(), getThemeSettings(), canManageSettings ? getSiteSettings() : Promise.resolve(null)]);
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Workspace control</span><h1 className="page-title">Appearance.</h1><p className="page-subtitle">Shape the global visual system, reusable typography, page layout, and site identity used throughout this standalone workspace.</p></div></div>{canManageSettings && siteSettings ? <SiteSettingsForm settings={siteSettings} /> : <div className="notice-banner"><LockKeyhole size={17} /><span><strong>Manager appearance access.</strong> Company identity remains administrator-only, while the visual system below is available for appearance managers.</span></div>}<AppearanceStudio initialAppearance={appearance} /><ThemeSettingsForm settings={theme} /></div>;
}
