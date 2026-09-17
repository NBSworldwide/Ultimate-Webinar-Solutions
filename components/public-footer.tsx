import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { getSiteSettings, siteAddressLines, siteContactEmail } from "@/lib/site-settings";

export async function PublicFooter() {
  const settings = await getSiteSettings();
  const address = siteAddressLines(settings);
  const email = siteContactEmail(settings);
  const policyLinks = [
    [settings.privacyUrl, "Privacy"],
    [settings.termsUrl, "Terms"],
    [settings.shippingPolicyUrl, "Shipping & returns"],
  ] as const;
  return <footer className="public-footer"><div className="public-footer-main"><div><span className="eyebrow">{settings.displayName}</span><h2>{settings.tagline}</h2>{settings.description ? <p>{settings.description}</p> : null}</div><div className="public-footer-contact" aria-label="Company contact information">{address.length > 0 ? <div><MapPin size={14} /><span>{address.map((line) => <span key={line}>{line}</span>)}</span></div> : null}{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={14} />{settings.phone}</a> : null}{email ? <a href={`mailto:${email}`}><Mail size={14} />{email}</a> : null}</div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} {settings.legalName || settings.displayName}</span><nav aria-label="Footer links">{settings.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}{policyLinks.map(([href, label]) => href ? <a href={href} key={href}>{label}</a> : null)}<Link href="/login">Admin sign in</Link></nav></div></footer>;
}
