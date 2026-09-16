import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { SeatRegistrationForm } from "@/components/seat-registration-form";
import { EntityGraph } from "@/components/seo/entity-graph";
import { getPublicWebinarBySlug } from "@/lib/data";
import { formatDateTime, initials } from "@/lib/format";
import { buildWebinarGraph } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const webinar = await getPublicWebinarBySlug((await params).slug);
  return webinar ? { title: webinar.title, description: webinar.description, alternates: { canonical: `/webinars/${webinar.slug}` } } : { title: "Session not found" };
}

export default async function WebinarDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const webinar = await getPublicWebinarBySlug((await params).slug);
  if (!webinar) notFound();
  const formTiers = webinar.tiers.map((tier) => ({ id: tier.id, name: tier.name, priceCents: tier.priceCents, capacity: tier.capacity, seats: tier.seats.map((seat) => ({ id: seat.id, number: seat.number, status: seat.status })) }));
  return <div className="public-shell"><EntityGraph data={buildWebinarGraph(webinar)} /><PublicHeader /><main className="public-main" id="main-content"><Link href="/webinars" className="breadcrumb"><ArrowLeft size={13} /> All sessions</Link><div className="public-detail" style={{ marginTop: 29 }}><article className="public-detail-copy"><span className="eyebrow">{webinar.eyebrow}</span><h1>{webinar.title}</h1><p>{webinar.longDescription}</p><div className="detail-meta"><span><CalendarDays size={13} />{formatDateTime(webinar.startsAt, webinar.timezone)}</span><span><Clock3 size={13} />{webinar.durationMinutes} minutes</span><span><MonitorPlay size={13} />{webinar.provider}</span></div><div className="host-card"><div className="host-avatar">{initials(webinar.hostName)}</div><div><strong>Hosted by {webinar.hostName}</strong><small>{webinar.hostBio}</small></div></div></article><SeatRegistrationForm webinarId={webinar.id} tiers={formTiers} /></div></main></div>;
}
