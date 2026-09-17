import { Mail, MapPin, Phone } from "lucide-react";
import { getNavigationItemsForLocation, type NavigationMenuItemView } from "@/lib/navigation";
import { PublicNavigation } from "@/components/public-navigation";
import { getSiteSettings, siteAddressLines, siteContactEmail } from "@/lib/site-settings";

export async function PublicFooter() {
  const [settings, navigationItems] = await Promise.all([getSiteSettings(), getNavigationItemsForLocation("footer")]);
  const address = siteAddressLines(settings);
  const email = siteContactEmail(settings);
  const fallbackFooterItems: NavigationMenuItemView[] = [
    ["Sessions", "/webinars"], ["Shop", "/products"], ["Refund policy", "/refund-policy"], ["Return policy", "/return-policy"], ["Shipping policy", "/shipping-policy"], ["Admin sign in", "/login"],
  ].map(([label, href], index) => ({ id: `fallback-footer-${index}`, parentId: null, label, href, itemType: "system", entityId: href, openInNewTab: false, isVisible: true, sortOrder: index, autoAdded: false }));
  const footerItems = (navigationItems.length > 0 ? navigationItems : fallbackFooterItems).filter((item) => item.href !== settings.supportUrl);
  return <footer className="public-footer"><div className="public-footer-main"><div><span className="eyebrow">{settings.displayName}</span><h2>{settings.tagline}</h2>{settings.description ? <p>{settings.description}</p> : null}</div><div className="public-footer-contact" role="group" aria-label="Company contact information">{address.length > 0 ? <div><MapPin size={14} /><span>{address.map((line) => <span key={line}>{line}</span>)}</span></div> : null}{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={14} />{settings.phone}</a> : null}{email ? <a href={`mailto:${email}`}><Mail size={14} />{email}</a> : null}</div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} {settings.legalName || settings.displayName}</span><div className="public-footer-links"><PublicNavigation items={footerItems} ariaLabel="Footer links" className="public-footer-nav" />{settings.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}</div></div></footer>;
}
