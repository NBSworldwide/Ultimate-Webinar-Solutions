import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, LogIn, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerRegistrations } from "@/lib/data";
import { formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Attendee account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const registrations = getCustomerRegistrations(user.id);
  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><div className="page-topline"><div><span className="eyebrow">Attendee portal</span><h1 className="page-title">Your sessions.</h1><p className="page-subtitle">Welcome back, {user.name}. Your registration and replay access live here.</p></div><LogoutButton /></div><div className="notice-banner"><LogIn size={16} /><span>This is a synthetic demo account. The account portal is intentionally separate from the legacy workspace.</span></div>{registrations.length > 0 ? <div className="form-grid">{registrations.map((registration) => <article className="account-card" key={registration.id}><span className="eyebrow">{registration.tierName} · Seat {registration.seatNumber}</span><h2>{registration.webinarTitle}</h2><p><CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Registered {formatDateTime(registration.createdAt)} · {formatMoney(registration.priceCents)}</p>{registration.accessStatus === "active" ? <Link className="replay-link" href={`/account/replays/${registration.id}`}><PlayCircle size={16} /> Open replay access <ArrowUpRight size={14} /></Link> : <p className="form-error">Replay access removed.</p>}</article>)}</div> : <div className="empty-state panel"><div className="empty-icon"><CalendarDays size={20} /></div><h3>No registrations yet</h3><p>Browse the live sessions and reserve your first seat.</p><Link className="button" href="/webinars" style={{ marginTop: 17 }}>Browse sessions</Link></div>}</main></div>;
}
