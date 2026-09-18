import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, MapPin, Pencil, Plus } from "lucide-react";
import { getServiceLocations } from "@/lib/service-locations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Service locations", robots: { index: false, follow: false } };

export default async function ServiceLocationsAdminPage() {
  const locations = await getServiceLocations({ includeUnpublished: true });
  return <div className="content-width">
    <div className="page-topline"><div><span className="eyebrow">Content management</span><h1 className="page-title">Service locations.</h1><p className="page-subtitle">Manage location records once, then publish each public page from the shared service-location template.</p></div><Link href="/admin/locations/new" className="button"><Plus size={15} /> Add service location</Link></div>
    <div className="notice-banner"><MapPin size={17} /><span><strong>Reusable page workflow.</strong> Each record owns its public copy and creates a matching location page. Edit the record here; use the linked Pages editor when you need to change block placement, layout, or styling.</span></div>
    <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Managed locations <span className="muted">({locations.length})</span></h2><span className="row-meta">Public detail pages use /locations/location-slug</span></div><MapPin size={17} color="#8b9995" /></div>
      {locations.length > 0 ? <div className="service-location-admin-list">{locations.map((location) => <article className="service-location-admin-row" key={location.id}>
        <span className={`service-location-admin-icon ${location.accent}`}><MapPin size={17} /></span>
        <span className="service-location-admin-copy"><span className="service-location-admin-title"><strong>{location.city}, {location.region}</strong><span className="row-meta">{location.timezone}</span></span><small>{location.title}</small><small>/locations/{location.slug} · {location.bestFor.length} use case{location.bestFor.length === 1 ? "" : "s"} · {location.deliveryModes.length} delivery mode{location.deliveryModes.length === 1 ? "" : "s"}</small></span>
        <span className={`status-badge status-${location.pageStatus === "published" ? "active" : location.pageStatus === "archived" ? "queued" : "draft"}`}><span className="status-dot" />{location.pageStatus}</span>
        <span className="detail-actions"><Link className="button button-secondary button-small" href={`/admin/locations/${location.id}/edit`}><Pencil size={13} /> Edit details</Link><Link className="button button-secondary button-small" href={`/admin/pages/${location.pageId}/edit`}><FileText size={13} /> Edit template</Link>{location.pageStatus === "published" ? <Link className="icon-button" href={`/locations/${location.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${location.city} service location`}><ExternalLink size={14} /></Link> : null}</span>
      </article>)}</div> : <div className="empty-state"><MapPin size={20} /><h3>No service locations yet</h3><p>Add a location record to create a reusable public detail page.</p><Link href="/admin/locations/new" className="button" style={{ marginTop: 14 }}>Add service location</Link></div>}
    </section>
  </div>;
}
