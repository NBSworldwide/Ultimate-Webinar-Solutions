import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

export function PublicHeader() {
  return <header className="public-header"><Link href="/webinars" className="public-brand"><span className="brand-mark brand-mark-small"><Sparkles size={15} /></span><span>Webinar Studio</span></Link><nav className="public-nav"><Link href="/webinars">Sessions</Link><Link href="/locations">Service locations</Link><Link href="/login" className="public-login">Sign in <ArrowUpRight size={15} /></Link></nav></header>;
}
