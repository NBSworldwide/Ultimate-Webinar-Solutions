import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, Globe2, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { serviceLocations } from "@/content/locations";
import { EntityGraph } from "@/components/seo/entity-graph";
import { PublicHeader } from "@/components/public-header";
import { buildLocationIndexGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Service locations",
  description: "Virtual-first webinar facilitation and operations coverage examples for teams in selected U.S. time zones.",
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  return (
    <div className="public-shell">
      <EntityGraph data={buildLocationIndexGraph(serviceLocations)} />
      <PublicHeader />
      <main className="public-main" id="main-content">
        <div className="location-hero">
          <div>
            <span className="eyebrow">Virtual-first coverage</span>
            <h1>Service locations that keep the room in sync.</h1>
            <p>Explore sample service-area pages for teams planning briefings, interactive labs, and tabletop workshops across different time zones.</p>
          </div>
          <div className="location-hero-orbit" aria-hidden="true"><Globe2 size={34} /><span>UTC-aware</span></div>
        </div>

        <div className="notice-banner location-note"><MapPin size={17} /><span><strong>Sample service coverage.</strong> These pages describe virtual-first delivery examples. They do not claim a physical office, local address, review history, or imported customer relationship.</span></div>

        <section className="location-index-grid" aria-label="Sample service locations">
          {serviceLocations.map((location) => (
            <article className={`location-index-card ${location.accent}`} key={location.slug}>
              <div className="location-card-topline"><span className="location-icon"><MapPin size={16} /></span><span className="eyebrow">{location.timezone}</span></div>
              <h2>{location.title}</h2>
              <p>{location.summary}</p>
              <div className="location-card-meta"><span><Video size={13} /> {location.deliveryModes[0]}</span><span><CalendarDays size={13} /> {location.bestFor.length} use cases</span></div>
              <Link className="button button-small" href={`/locations/${location.slug}`}>Explore coverage <ArrowUpRight size={14} /></Link>
            </article>
          ))}
        </section>

        <section className="location-principles" aria-labelledby="location-principles-title">
          <div><span className="eyebrow">One operating model</span><h2 id="location-principles-title">Useful context, wherever the team is.</h2></div>
          <div className="location-principle-list"><div><strong>Plan in the right time zone</strong><p>Every session stores its UTC start time together with an IANA timezone for a clear attendee experience.</p></div><div><strong>Keep the live room human</strong><p>Facilitation patterns make space for questions, decisions, and a concrete next step.</p></div><div><strong>Close the loop</strong><p>Registration, delivery, and replay handoffs have an observable home in the operations workspace.</p></div></div>
        </section>
      </main>
    </div>
  );
}
