import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageRenderer } from "@/components/page-renderer";
import { getNavigationItemsForLocation, getNavigationMenus, type NavigationMenuItemView } from "@/lib/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { getCurrentUser } from "@/lib/auth";
import { PublicNavigation } from "@/components/public-navigation";
import { getActiveSiteTemplate } from "@/lib/templates";

const fallbackHeaderItems: NavigationMenuItemView[] = [
  ["sessions", "Sessions", "/webinars"], ["shop", "Shop", "/products"], ["cart", "Cart", "/cart"], ["account", "My account", "/account"], ["locations", "Service locations", "/locations"], ["privacy-policy", "Privacy Policy", "/privacy-policy"], ["terms-and-conditions", "Terms & Conditions", "/terms-and-conditions"], ["sign-in", "Sign in", "/login"],
].map(([entityId, label, href], index) => ({ id: `fallback-header-${index}`, parentId: null, label, href, itemType: "system", entityId, openInNewTab: false, isVisible: true, sortOrder: index, autoAdded: false }));

export async function PublicHeader() {
  const [settings, navigationItems, navigationMenus, currentUser, template] = await Promise.all([getSiteSettings(), getNavigationItemsForLocation("header"), getNavigationMenus(), getCurrentUser(), getActiveSiteTemplate("header")]);
  if (template) return <header className="public-header public-template-header"><div className="public-template-renderer"><PageRenderer blocks={template.blocks} navigationMenus={navigationMenus} isAuthenticated={Boolean(currentUser)} /></div></header>;
  return <header className="public-header"><Link href="/" className="public-brand" aria-label={`${settings.displayName} home`}><span className="brand-mark brand-mark-small">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={20} height={20} /> : <Sparkles size={15} />}</span><span>{settings.displayName}</span></Link><PublicNavigation items={navigationItems.length > 0 ? navigationItems : fallbackHeaderItems} ariaLabel="Primary navigation" isAuthenticated={Boolean(currentUser)} /></header>;
}
