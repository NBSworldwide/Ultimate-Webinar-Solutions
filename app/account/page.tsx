import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, LogIn, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { LogoutButton } from "@/components/logout-button";
import { AccountProfileForm } from "@/components/account-profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getCurrentUser } from "@/lib/auth";
import { getAccountProfile } from "@/lib/account-security";
import { getCustomerRegistrations } from "@/lib/data";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getOrders } from "@/lib/commerce";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [registrations, orders, profile] = await Promise.all([getCustomerRegistrations(user.id), getOrders({ query: user.email }), getAccountProfile(user.id)]);
  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><div className="page-topline"><div><span className="eyebrow">Your account</span><h1 className="page-title">Your account.</h1><p className="page-subtitle">Welcome back, {user.name}. Manage your profile, security, session access, and product orders in one place.</p></div><LogoutButton /></div><div className="notice-banner"><LogIn size={16} /><span>This is a synthetic demo account. The account portal is intentionally separate from the legacy workspace.</span></div><section className="account-management-grid"><AccountProfileForm profile={profile} /><ChangePasswordForm /></section><section><div className="panel-header"><h2 className="panel-title">Sessions</h2></div>{registrations.length > 0 ? <div className="form-grid">{registrations.map((registration) => <article className="account-card" key={registration.id}><span className="eyebrow">{registration.tierName} · Seat {registration.seatNumber}</span><h2>{registration.webinarTitle}</h2><p><CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Registered {formatDateTime(registration.createdAt)} · {formatMoney(registration.priceCents)}</p>{registration.accessStatus === "active" ? <Link className="replay-link" href={`/account/replays/${registration.id}`}><PlayCircle size={16} /> Open replay access <ArrowUpRight size={14} /></Link> : <p className="form-error">Replay access removed.</p>}</article>)}</div> : <div className="empty-state panel"><h3>No registrations yet</h3><Link className="button" href="/webinars" style={{ marginTop: 17 }}>Browse sessions</Link></div>}</section><section style={{ marginTop: 36 }}><div className="panel-header"><h2 className="panel-title">Orders</h2></div>{orders.length > 0 ? <div className="form-grid">{orders.map((order) => <article className="account-card" key={order.id}><span className="eyebrow">{order.orderNumber} · {order.fulfillmentStatus}</span><h2>{formatMoney(order.totalCents)}</h2><p>{order.items.map((item) => `${item.productName}${item.variantName ? ` — ${item.variantName}` : ""} × ${item.quantity}`).join(", ")}</p><small>{formatDateTime(order.createdAt)}</small></article>)}</div> : <div className="empty-state panel"><h3>No product orders yet</h3><Link className="button" href="/products" style={{ marginTop: 17 }}>Shop products</Link></div>}</section></main><PublicFooter /></div>;
}
