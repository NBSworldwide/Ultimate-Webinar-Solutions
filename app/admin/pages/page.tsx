import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { PageRowActions } from "@/components/page-row-actions";
import { getPages } from "@/lib/pages";
import type { ContentPage, PageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pages", robots: { index: false, follow: false } };
const statuses: Array<PageStatus | "all"> = ["all", "draft", "published", "archived"];
function publicPath(page: ContentPage): string { return page.isHomepage ? "/" : page.slug === "service-locations" ? "/locations" : page.slug === "products" ? "/products" : page.slug.startsWith("location-") ? `/locations/${page.slug.slice("location-".length)}` : `/pages/${page.slug}`; }

export default async function AdminPagesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as PageStatus | "all") ? params.status as PageStatus | "all" : "all";
  const query = params.q?.trim() ?? "";
  const pages = await getPages({ query, status });
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Content management</span><h1 className="page-title">Pages.</h1><p className="page-subtitle">Build reusable public pages with familiar blocks, drafts, previews, and publishing controls.</p></div><Link href="/admin/pages/new" className="button"><Plus size={15} /> Add new page</Link></div><section className="panel"><div className="admin-filter-bar"><form method="get" className="admin-filter-form"><div className="admin-search-field"><Search size={15} /><input name="q" defaultValue={query} placeholder="Search pages or slugs" aria-label="Search pages" /></div><select name="status" defaultValue={status} aria-label="Filter pages by status">{statuses.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>)}</select><button className="button button-small" type="submit">Filter</button>{query || status !== "all" ? <Link href="/admin/pages" className="panel-link">Clear</Link> : null}</form><span className="row-meta">{pages.length} result{pages.length === 1 ? "" : "s"}</span></div><div className="panel-header"><div><h2 className="panel-title">All pages <span className="muted">({pages.length})</span></h2><span className="row-meta">Drag and drop blocks inside each page editor</span></div><FileText size={17} color="#8b9995" /></div>{pages.length > 0 ? <div className="page-admin-list">{pages.map((page) => <article className="page-admin-row" key={page.id}><span className="page-admin-icon"><FileText size={17} /></span><span className="page-admin-copy"><span className="page-admin-title"><strong>{page.title}</strong>{page.isHomepage ? <span className="page-home-badge">Homepage</span> : null}</span><small>{publicPath(page)} · {page.blocks.length} block{page.blocks.length === 1 ? "" : "s"} · revision {page.revision}</small>{page.excerpt ? <small>{page.excerpt}</small> : null}</span><span className={`status-badge status-${page.status === "published" ? "active" : page.status === "archived" ? "queued" : "draft"}`}><span className="status-dot" />{page.status}</span><PageRowActions page={page} /></article>)}</div> : <div className="empty-state"><FileText size={20} /><h3>No pages match these filters</h3><p>Create an About, FAQ, policy, or campaign page from the editor.</p></div>}</section></div>;
}
