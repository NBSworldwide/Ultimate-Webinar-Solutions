import type { Metadata } from "next";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { appearanceCssVariables, appearanceResponsiveCss, getAppearance } from "@/lib/appearance";
import { getSiteSettings } from "@/lib/site-settings";
import { getThemeSettings, themeCssVariables } from "@/lib/theme-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    applicationName: settings.displayName,
    title: { default: settings.displayName, template: `%s · ${settings.displayName}` },
    description: settings.tagline || settings.description,
    icons: settings.faviconUrl || settings.logoUrl ? { icon: settings.faviconUrl || settings.logoUrl } : undefined,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, theme, appearance] = await Promise.all([getSiteSettings(), getThemeSettings(), getAppearance()]);
  const appearanceStyle = appearanceCssVariables(appearance);
  return (
    <html lang="en">
      <body className={`theme-body theme-body-${theme.bodyStyle} theme-spacing-${theme.sectionSpacing}`} style={{ ...themeCssVariables(theme), ...appearanceStyle }}><style id="appearance-custom-css" dangerouslySetInnerHTML={{ __html: `${appearanceResponsiveCss(appearance)}${appearance.settings.customCss}` }} /><a className="skip-link" href="#main-content">Skip to content</a><AgeGate enabled={settings.ageGateEnabled}>{children}</AgeGate></body>
    </html>
  );
}
