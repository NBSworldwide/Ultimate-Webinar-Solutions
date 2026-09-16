import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { getWebinars } from "@/lib/data";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function AdminWebinarsPage() {
  const webinars = getWebinars(false);
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Program management</span><h1 className="page-title">Webinars</h1><p className="page-subtitle">Prepare, publish, and monitor every session from one place.</p></div><Link href="/admin/webinars/new" className="button"><Plus size={16} /> New webinar</Link></div><section className="panel"><div className="panel-header"><h2 className="panel-title">All sessions <span className="muted">({webinars.length})</span></h2><span className="eyebrow">Synthetic demo data</span></div><div className="webinar-list">{webinars.map((webinar) => <Link href={`/admin/webinars/${webinar.id}`} className="webinar-row" key={webinar.id}><span className={`accent-bar ${webinar.accent === "coral" ? "coral" : webinar.accent === "gold" ? "gold" : ""}`} /><span><strong className="row-title">{webinar.title}</strong><span className="row-meta"><span>{formatDateTime(webinar.startsAt, webinar.timezone)}</span><span>{webinar.provider}</span></span></span><span className="row-metric"><strong>{webinar.sold}/{webinar.capacity}</strong><small>{formatMoney(webinar.revenueCents)} booked</small><ProgressBar value={webinar.sold} max={webinar.capacity} tone={webinar.accent === "coral" ? "coral" : webinar.accent === "gold" ? "gold" : "teal"} /></span><StatusBadge status={webinar.status} /></Link>)}</div></section></div>;
}
