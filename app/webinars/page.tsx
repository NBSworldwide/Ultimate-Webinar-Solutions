import type { Metadata } from "next";
import { CalendarRange, CheckCircle2 } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { EntityGraph } from "@/components/seo/entity-graph";
import { WebinarCard } from "@/components/webinar-card";
import { getPublicWebinars } from "@/lib/data";
import { buildWebinarIndexGraph } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live sessions",
  description: "Browse upcoming live sessions from Webinar Studio.",
  alternates: { canonical: "/webinars" },
};

export default async function WebinarsPage() {
  const webinars = await getPublicWebinars();
  return <div className="public-shell"><EntityGraph data={buildWebinarIndexGraph(webinars)} /><PublicHeader /><main className="public-main" id="main-content"><section className="public-hero"><span className="eyebrow">Learn together, live</span><h1>Sessions built for the work ahead.</h1><p>Practical briefings, interactive labs, and focused workshops—designed with room for questions, reflection, and a next step you can actually use.</p></section><div className="notice-banner"><CheckCircle2 size={17} /><span><strong>Fresh-start workspace.</strong> Every listing and attendee record in this demo is synthetic. No archived products or customer data are connected.</span></div>{webinars.length > 0 ? <section className="public-grid" aria-label="Upcoming sessions">{webinars.map((webinar) => <WebinarCard key={webinar.id} webinar={webinar} />)}</section> : <div className="empty-state panel"><div className="empty-icon"><CalendarRange size={20} /></div><h3>No sessions are published yet</h3><p>Use the admin workspace to create the first session.</p></div>}</main></div>;
}
