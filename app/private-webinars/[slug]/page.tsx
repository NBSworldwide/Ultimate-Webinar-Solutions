import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, LockKeyhole, MonitorPlay, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PrivateInviteAccessForm } from "@/components/private-invite-access-form";
import { SeatRegistrationForm } from "@/components/seat-registration-form";
import { getCurrentUser } from "@/lib/auth";
import { getPrivateWebinarBySlug } from "@/lib/data";
import { getPrivateAccessToken } from "@/lib/private-access";
import { formatDateTime, initials } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private webinar access", robots: { index: false, follow: false } };

export default async function PrivateWebinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [privateAccessToken, user] = await Promise.all([getPrivateAccessToken(), getCurrentUser()]);
  const webinar = await getPrivateWebinarBySlug(slug, privateAccessToken);
  const isFree = webinar ? webinar.tiers.length > 0 && webinar.tiers.every((tier) => tier.priceCents === 0) : false;

  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content">{webinar ? <><Link href="/webinars" className="breadcrumb"><ArrowLeft size={13} /> Back to public sessions</Link><div className="private-detail-heading"><span className="eyebrow"><LockKeyhole size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Invitation verified</span><h1>{webinar.title}</h1><p>{webinar.longDescription}</p><div className="detail-meta"><span><CalendarDays size={13} />{formatDateTime(webinar.startsAt, webinar.timezone)}</span><span><Clock3 size={13} />{webinar.durationMinutes} minutes</span><span><MonitorPlay size={13} />{webinar.provider}</span></div><div className="host-card"><div className="host-avatar">{initials(webinar.hostName)}</div><div><strong>Hosted by {webinar.hostName}</strong><small>{webinar.hostBio}</small></div></div></div><div className="notice-banner private-access-banner"><ShieldCheck size={17} /><span><strong>Your invitation is verified.</strong> Registration email must match the invitation before access can be finalized.</span></div><div className="private-registration-layout"><section className="summary-card"><span className="eyebrow">Private attendee room</span><h2>{webinar.description}</h2><p>{isFree ? "This private session is free to attend, but an invitation is still required. Reserve a seat below to confirm your registration." : "This invite-only session is not listed publicly. Reserve a seat below; payment is confirmed before the private room opens."}</p><div className="private-room-note"><LockKeyhole size={15} /><span>Private access is tied to your invitation and a short-lived browser session.</span></div></section><SeatRegistrationForm webinarId={webinar.id} tiers={webinar.tiers} isFree={isFree} isAuthenticated={Boolean(user)} customer={user ? { name: user.name, email: user.email } : null} returnTo={`/private-webinars/${webinar.slug}`} successHref={`/private-webinars/${webinar.slug}/room`} successCtaLabel="Open private room" /></div></> : <div className="private-gate-layout"><div><span className="eyebrow">Private session</span><h1 className="page-title">Invitation required.</h1><p className="page-subtitle">This session is available only to attendees with a valid invitation code.</p><Link href="/webinars" className="breadcrumb" style={{ marginTop: 18 }}><ArrowLeft size={13} /> Browse public sessions</Link></div><PrivateInviteAccessForm slug={slug} /></div>}</main><PublicFooter /></div>;
}
