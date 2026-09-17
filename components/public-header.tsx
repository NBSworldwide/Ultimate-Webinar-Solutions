import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getNavigationItemsForLocation, type NavigationMenuItemView } from "@/lib/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { PublicNavigation } from "@/components/public-navigation";

const fallbackHeaderItems: NavigationMenuItemView[] = [
  ["Sessions", "/webinars"], ["Shop", "/products"], ["Cart", "/cart"], ["My account", "/account"], ["Service locations", "/locations"], ["Privacy Policy", "/privacy-policy"], ["Terms & Conditions", "/terms-and-conditions"], ["Sign in", "/login"],
].map(([label, href], index) => ({ id: `fallback-header-${index}`, parentId: null, label, href, itemType: "system", entityId: href, openInNewTab: false, isVisible: true, sortOrder: index, autoAdded: false }));

export async function PublicHeader() {
  const [settings, navigationItems] = await Promise.all([getSiteSettings(), getNavigationItemsForLocation("header")]);
  return <header className="public-header"><Link href="/webinars" className="public-brand" aria-label={`${settings.displayName} home`}><span className="brand-mark brand-mark-small">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={20} height={20} /> : <Sparkles size={15} />}</span><span>{settings.displayName}</span></Link><PublicNavigation items={navigationItems.length > 0 ? navigationItems : fallbackHeaderItems} ariaLabel="Primary navigation" /></header>;
}
