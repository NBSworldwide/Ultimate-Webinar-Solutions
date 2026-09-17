import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, LockKeyhole, PlayCircle, Radio, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PrivateInviteAccessForm } from "@/components/private-invite-access-form";
import { getPrivateWebinarRoomBySlug } from "@/lib/data";
import { getPrivateAccessToken } from "@/lib/private-access";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private webinar room", robots: { index: false, follow: false } };

export default async function PrivateWebinarRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const access = await getPrivateWebinarRoomBySlug(slug, await getPrivateAccessToken());

  const isFree = access ? access.webinar.tiers.length > 0 && access.webinar.tiers.every((tier) => tier.priceCents === 0) : false;
  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content">{access ? <><Link href={`/private-webinars/${access.webinar.slug}`} className="breadcrumb"><ArrowLeft size={13} /> Back to private session</Link><div className="page-topline private-room-topline"><div><span className="eyebrow"><LockKeyhole size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Private attendee room</span><h1 className="page-title">{access.webinar.title}</h1><p className="page-subtitle">{formatDateTime(access.webinar.startsAt, access.webinar.timezone)} · {access.webinar.durationMinutes} minutes</p></div><span className="visibility-pill visibility-private">Invite only</span></div>{access.registered ? <section className="replay-panel private-room-panel"><div className="replay-panel-icon"><PlayCircle size={30} /></div><div><span className="eyebrow">Registration verified</span><h2>Your private room is ready.</h2><p>{isFree ? "Your free registration has been confirmed." : "Your paid registration has been confirmed."} When a live provider is connected, this page will host the live broadcast and later the gated replay.</p><div className="private-room-status-grid"><div><Radio size={16} /><strong>Live session</strong><span>Provider connection pending</span></div><div><PlayCircle size={16} /><strong>Replay</strong><span>Signed playback will appear here</span></div></div><div className="notice-banner"><ShieldCheck size={16} /><span><strong>Access protected.</strong> The app checks your invitation, registration, payment state, and access status before showing room content.</span></div></div></section> : <section className="summary-card private-payment-card"><div className="empty-icon"><Clock3 size={20} /></div><span className="eyebrow">Registration required</span><h2>Finish registration to open the room.</h2><p>{isFree ? "This private session is free, but you still need to register before entering the room." : "This private room opens after the demo registration is recorded as paid. Return to the session page to reserve a seat."}</p><Link href={`/private-webinars/${access.webinar.slug}`} className="button" style={{ marginTop: 16 }}>Return to registration</Link></section>}<div className="notice-banner" style={{ marginTop: 20 }}><CheckCircle2 size={16} /><span>The standalone demo does not contact a video or payment provider. Those adapters can be connected in a later release.</span></div></> : <div className="private-gate-layout"><div><span className="eyebrow">Private room</span><h1 className="page-title">Verify your invitation.</h1><p className="page-subtitle">A valid invite code is required before the private room can be opened.</p><Link href="/webinars" className="breadcrumb" style={{ marginTop: 18 }}><ArrowLeft size={13} /> Browse public sessions</Link></div><PrivateInviteAccessForm slug={slug} /></div>}</main><PublicFooter /></div>;
}
