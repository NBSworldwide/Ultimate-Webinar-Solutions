import Link from "next/link";
import { ArrowUpRight, ShoppingCart, Sparkles } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export async function PublicHeader() {
  const settings = await getSiteSettings();
  return <header className="public-header"><Link href="/webinars" className="public-brand" aria-label={`${settings.displayName} home`}><span className="brand-mark brand-mark-small">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={20} height={20} /> : <Sparkles size={15} />}</span><span>{settings.displayName}</span></Link><nav className="public-nav"><Link href="/webinars">Sessions</Link><Link href="/products">Shop</Link><Link href="/cart"><ShoppingCart size={15} /> Cart</Link><Link href="/account">My account</Link><Link href="/locations">Service locations</Link><Link href="/login" className="public-login">Sign in <ArrowUpRight size={15} /></Link></nav></header>;
}
