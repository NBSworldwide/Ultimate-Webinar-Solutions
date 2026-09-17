import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { NavigationManager } from "@/components/navigation-manager";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { getNavigationCandidates, getNavigationMenus } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Navigation", robots: { index: false, follow: false } };

export default async function NavigationPage() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) redirect("/admin");
  const [menus, candidates] = await Promise.all([getNavigationMenus(), getNavigationCandidates()]);
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Appearance control</span><h1 className="page-title">Navigation.</h1><p className="page-subtitle">Build WordPress-familiar menus with sortable links, nested items, automatic page additions, and reusable header, footer, or mobile placements.</p></div><span className="status-badge status-active"><span className="status-dot" />{menus.length} menus</span></div><div className="notice-banner"><Menu size={17} /><span><strong>Native menu management.</strong> Public pages, products, sessions, categories, and safe custom links can be curated here. Private sessions, admin routes, and unpublished pages are never offered as public candidates.</span></div><NavigationManager menus={menus} candidates={candidates} /><div className="insight-card navigation-insight"><span className="eyebrow"><Sparkles size={12} /> Page builder connection</span><h3>Menus can be placed inside any page.</h3><p>In the page editor, add the Navigation menu block, choose a saved menu, and select a horizontal or stacked layout. The block always uses the menu’s current labels and nesting.</p></div></div>;
}
