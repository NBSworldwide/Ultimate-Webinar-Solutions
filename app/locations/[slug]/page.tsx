import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Globe2, MapPin, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PublicHeader } from "@/components/public-header";
import { getServiceLocation, serviceLocations } from "@/content/locations";
import { buildLocationGraph } from "@/lib/seo";

type LocationPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return serviceLocations.map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = getServiceLocation((await params).slug);
  if (!location) return { title: "Location not found" };
  return { title: location.title, description: location.summary, alternates: { canonical: `/locations/${location.slug}` } };
}

export default async function LocationDetailPage({ params }: LocationPageProps) {
  const location = getServiceLocation((await params).slug);
  if (!location) notFound();

  const otherLocations = serviceLocations.filter((item) => item.slug !== location.slug);
  return (
    <div className="public-shell">
      <EntityGraph data={buildLocationGraph(location)} />
      <PublicHeader />
      <main className="public-main" id="main-content">
        <Link href="/locations" className="breadcrumb"><ArrowLeft size={13} /> All service locations</Link>

        <section className={`location-detail-hero ${location.accent}`}>
          <div className="location-detail-copy">
            <span className="eyebrow">{location.eyebrow}</span>
            <h1>{location.title}</h1>
            <p>{location.description}</p>
            <div className="detail-meta"><span><MapPin size={13} />{location.city}, {location.region}</span><span><Clock3 size={13} />{location.timezone}</span><span><Globe2 size={13} />Virtual-first</span></div>
            <div className="location-cta-row"><Link href="/webinars" className="button">Browse live sessions <ArrowUpRight size={15} /></Link><Link href="#service-formats" className="button button-secondary">See service formats</Link></div>
          </div>
          <aside className="location-aside"><span className="location-aside-icon"><MonitorPlay size={19} /></span><span className="eyebrow">Delivery promise</span><h2>Make the next step obvious.</h2><p>Use a focused agenda, a visible registration path, and a clean handoff after the live room.</p><div className="location-aside-stat"><strong>{location.deliveryModes.length}</strong><span>sample delivery modes</span></div></aside>
        </section>

        <section className="location-content-section" id="service-formats" aria-labelledby="formats-title">
          <div className="section-heading"><span className="eyebrow">Service formats</span><h2 id="formats-title">A practical path from planning to replay.</h2><p>Each format is a reusable starting point. Operators can adapt the session without coupling it to a product catalog.</p></div>
          <div className="location-format-grid">{location.deliveryModes.map((format, index) => <article className="location-format-card" key={format}><span className="format-number">0{index + 1}</span><h3>{format}</h3><p>{["Shape the brief, audience, and run of show before the calendar invite goes out.", "Keep facilitation, questions, and seat state visible while the session is live.", "Queue the follow-up work so the replay and next action do not disappear after the room closes."][index] ?? "Turn a live session into a repeatable operating record."}</p></article>)}</div>
        </section>

        <section className="location-detail-columns">
          <div className="location-content-section compact"><div className="section-heading"><span className="eyebrow">Good fit for</span><h2>Designed around the work.</h2></div><ul className="location-check-list">{location.bestFor.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul></div>
          <div className="location-content-section compact"><div className="section-heading"><span className="eyebrow">Operating note</span><h2>Clear boundaries build trust.</h2></div><p className="location-boundary-copy">This page is synthetic sample content for the new standalone release. Add a real provider, confirmed schedule, and approved copy before publishing a live service area.</p><Link href="/admin/playbooks" className="panel-link">Review sample playbooks <ArrowUpRight size={13} /></Link></div>
        </section>

        <section className="location-faq-section" aria-labelledby="faq-title"><div className="section-heading"><span className="eyebrow">Questions</span><h2 id="faq-title">Before you plan the room.</h2></div><div className="location-faq-list">{location.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>

        <section className="related-locations" aria-labelledby="related-title"><div className="section-heading"><span className="eyebrow">Keep exploring</span><h2 id="related-title">Other sample coverage pages.</h2></div><div className="related-location-grid">{otherLocations.map((other) => <Link href={`/locations/${other.slug}`} className="related-location-card" key={other.slug}><span className="eyebrow">{other.timezone}</span><strong>{other.city}, {other.region}</strong><span>{other.summary}</span><ArrowUpRight size={15} /></Link>)}</div></section>
      </main>
    </div>
  );
}
