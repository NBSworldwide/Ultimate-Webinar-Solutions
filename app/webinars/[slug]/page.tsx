import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MonitorPlay, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { SeatRegistrationForm } from "@/components/seat-registration-form";
import { EntityGraph } from "@/components/seo/entity-graph";
import { getCurrentUser } from "@/lib/auth";
import { getPublicWebinarBySlug } from "@/lib/data";
import { formatDateTime, initials } from "@/lib/format";
import { buildWebinarGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const webinar = await getPublicWebinarBySlug((await params).slug);
  return webinar ? { title: webinar.title, description: webinar.description, alternates: { canonical: `/webinars/${webinar.slug}` } } : { title: "Session not found" };
}

export default async function WebinarDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [webinar, settings, user] = await Promise.all([getPublicWebinarBySlug(slug), getSiteSettings(), getCurrentUser()]);
  if (!webinar) notFound();
  const isFree = webinar.tiers.length > 0 && webinar.tiers.every((tier) => tier.priceCents === 0);
  const ended = webinar.status === "completed";
  const formTiers = webinar.tiers.map((tier) => ({ id: tier.id, name: tier.name, priceCents: tier.priceCents, capacity: tier.capacity, pricingModel: tier.pricingModel, referenceValueCents: tier.referenceValueCents, roundingMode: tier.roundingMode, seats: tier.seats.map((seat) => ({ id: seat.id, number: seat.number, status: seat.status })) }));
  return <div className="public-shell"><EntityGraph data={buildWebinarGraph(webinar, settings)} /><PublicHeader /><main className="public-main" id="main-content"><Link href={ended ? "/webinars?tab=ended" : "/webinars"} className="breadcrumb"><ArrowLeft size={13} /> All sessions</Link><div className="public-detail" style={{ marginTop: 29 }}><article className="public-detail-copy"><span className="eyebrow">{webinar.eyebrow}</span><h1>{webinar.title}</h1><p>{webinar.longDescription}</p><div className="detail-meta"><span><CalendarDays size={13} />{formatDateTime(webinar.startsAt, webinar.timezone)}</span><span><Clock3 size={13} />{webinar.durationMinutes} minutes</span><span><MonitorPlay size={13} />{webinar.provider}</span></div><div className="host-card"><div className="host-avatar">{initials(webinar.hostName)}</div><div><strong>Hosted by {webinar.hostName}</strong><small>{webinar.hostBio}</small></div></div></article>{ended ? <section className="registration-card"><div className="empty-icon"><PlayCircle size={21} /></div><span className="eyebrow">Session ended</span><h2>{webinar.replayUrl ? "Replay available" : "Replay coming soon"}</h2><p>{webinar.replayUrl ? webinar.replayLabel : "This session has ended. The replay will appear here when it is published."}</p>{webinar.replayUrl ? <a className="button" href={webinar.replayUrl} target="_blank" rel="noreferrer">View replay <PlayCircle size={15} /></a> : null}</section> : <SeatRegistrationForm webinarId={webinar.id} tiers={formTiers} isFree={isFree} isAuthenticated={Boolean(user)} customer={user ? { name: user.name, email: user.email } : null} returnTo={`/webinars/${webinar.slug}`} />}</div></main><PublicFooter /></div>;
}
