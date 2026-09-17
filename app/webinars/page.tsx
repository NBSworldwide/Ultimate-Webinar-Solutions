import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { EntityGraph } from "@/components/seo/entity-graph";
import { WebinarCard } from "@/components/webinar-card";
import { getPublicWebinars } from "@/lib/data";
import { buildWebinarIndexGraph } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: "Live sessions", description: `Browse upcoming live sessions from ${settings.displayName}.`, alternates: { canonical: "/webinars" } };
}

export default async function WebinarsPage({ searchParams }: { searchParams?: Promise<{ tab?: string; category?: string }> }) {
  const params = (await searchParams) ?? {};
  const tab = params.tab === "ended" ? "ended" : "available";
  const category = params.category?.trim() || "";
  const [webinars, settings] = await Promise.all([getPublicWebinars({ tab, category: category || undefined }), getSiteSettings()]);
  const categories = [...new Set(webinars.map((webinar) => webinar.eyebrow).filter(Boolean))];
  const tabHref = (nextTab: "available" | "ended") => nextTab === "ended" ? "/webinars?tab=ended" : "/webinars";
  const categoryHref = (nextCategory: string) => `/webinars?${new URLSearchParams({ ...(tab === "ended" ? { tab } : {}), ...(nextCategory ? { category: nextCategory } : {}) }).toString()}`;
  return <div className="public-shell"><EntityGraph data={buildWebinarIndexGraph(webinars, settings)} /><PublicHeader /><main className="public-main" id="main-content"><section className="public-hero"><span className="eyebrow">Learn together, live</span><h1>{tab === "ended" ? "Past sessions and replays." : "Sessions built for the work ahead."}</h1><p>{tab === "ended" ? "Review completed sessions and return to the ideas worth keeping." : "Practical briefings, interactive labs, and focused workshops—designed with room for questions, reflection, and a next step you can actually use."}</p></section><div className="notice-banner"><CheckCircle2 size={17} /><span><strong>Fresh-start workspace.</strong> Every listing and attendee record in this demo is synthetic. No archived products or customer data are connected.</span></div><nav className="catalog-toolbar" aria-label="Session catalog filters"><div className="catalog-tabs"><Link href={tabHref("available")} className={tab === "available" ? "catalog-tab active" : "catalog-tab"}>Seats available</Link><Link href={tabHref("ended")} className={tab === "ended" ? "catalog-tab active" : "catalog-tab"}>Ended</Link></div><div className="catalog-categories"><SlidersHorizontal size={14} /><Link href={categoryHref("")} className={!category ? "category-chip active" : "category-chip"}>All sessions</Link>{categories.map((item) => <Link href={categoryHref(item)} className={category === item ? "category-chip active" : "category-chip"} key={item}>{item}</Link>)}</div></nav>{webinars.length > 0 ? <section className="public-grid" aria-label={tab === "ended" ? "Ended sessions" : "Sessions with seats available"}>{webinars.map((webinar) => <WebinarCard key={webinar.id} webinar={webinar} />)}</section> : <div className="empty-state panel"><div className="empty-icon"><CalendarRange size={20} /></div><h3>{tab === "ended" ? "No ended sessions yet" : "No sessions match these filters"}</h3><p>{tab === "ended" ? "Completed sessions with replay access will appear here." : "Use the admin workspace to publish the first session."}</p></div>}</main><PublicFooter /></div>;
}
