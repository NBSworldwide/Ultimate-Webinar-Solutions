"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CircleHelp, ClipboardList, ContactRound, FileText, LayoutDashboard, Layers3, LockKeyhole, Mail, Menu, MessageSquareText, Package, Percent, Settings2, Sparkles, UsersRound, Warehouse } from "lucide-react";
import type { User } from "@/lib/types";
import type { SiteSettings } from "@/lib/types";
import { hasCapability, roleLabel } from "@/lib/authorization";
import { initials } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";

const navigationGroups = [
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, capability: "content.manage" },
      { href: "/admin/webinars", label: "Webinars", icon: CalendarDays, capability: "webinars.manage" },
      { href: "/admin/private-webinars", label: "Private webinars", icon: LockKeyhole, capability: "webinars.manage" },
      { href: "/admin/playbooks", label: "Playbooks", icon: Layers3, capability: "content.manage" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, capability: "catalog.manage" },
      { href: "/admin/products/brands", label: "Brands", icon: Package, capability: "catalog.manage" },
      { href: "/admin/products/categories", label: "Categories", icon: Package, capability: "catalog.manage" },
      { href: "/admin/products/tags", label: "Tags", icon: Package, capability: "catalog.manage" },
      { href: "/admin/products/attributes", label: "Attributes", icon: Package, capability: "catalog.manage" },
      { href: "/admin/products/reviews", label: "Reviews", icon: Package, capability: "catalog.manage" },
      { href: "/admin/coupons", label: "Coupons", icon: Percent, capability: "catalog.manage" },
      { href: "/admin/inventory", label: "Inventory sources", icon: Warehouse, capability: "inventory.manage" },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList, capability: "orders.manage" },
    ],
  },
  {
    label: "People & messaging",
    items: [
      { href: "/admin/registrations", label: "Registrations", icon: UsersRound, capability: "registrations.view" },
      { href: "/admin/crm", label: "CRM", icon: ContactRound, capability: "crm.manage" },
      { href: "/admin/email", label: "Email", icon: Mail, capability: "email.manage" },
      { href: "/admin/sms", label: "SMS", icon: MessageSquareText, capability: "messaging.manage" },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3, capability: "analytics.view" }],
  },
] as const;

export function AdminShell({ user, settings, children }: { user: User; settings: SiteSettings; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={24} height={24} /> : <Sparkles size={18} />}</div>
          <div><span className="brand-name">{settings.displayName}</span><span className="brand-subtitle">Admin workspace</span></div>
        </div>
        <div className="workspace-switcher"><span className="workspace-avatar">{settings.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{settings.displayName}</strong><small>Standalone release</small></span><span className="workspace-caret">⌄</span></div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Dashboard</p>
          <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "nav-item-active" : ""}`}><LayoutDashboard size={18} strokeWidth={pathname === "/admin" ? 2.3 : 1.8} /><span>Overview</span></Link>
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(({ capability }) => hasCapability(user, capability));
            if (visibleItems.length === 0) return null;
            return <div key={group.label} className="nav-group"><p className="nav-label nav-label-spaced">{group.label}</p>{visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span></Link>;
          })}</div>;
          })}
          <p className="nav-label nav-label-spaced">System</p>
          {hasCapability(user, "team.view") ? <Link href="/admin/team" className={`nav-item ${pathname.startsWith("/admin/team") ? "nav-item-active" : ""}`}><UsersRound size={18} /><span>Team & access</span></Link> : null}
          {hasCapability(user, "appearance.manage") ? <Link href="/admin/navigation" className={`nav-item ${pathname.startsWith("/admin/navigation") ? "nav-item-active" : ""}`}><Menu size={18} /><span>Navigation</span></Link> : null}
          {hasCapability(user, "appearance.manage") ? <Link href="/admin/settings" className={`nav-item ${pathname.startsWith("/admin/settings") ? "nav-item-active" : ""}`}><Settings2 size={18} /><span>Appearance & settings</span></Link> : null}
          <Link href="/admin/help" className={`nav-item ${pathname.startsWith("/admin/help") ? "nav-item-active" : ""}`}><CircleHelp size={18} /><span>Help center</span></Link>
        </nav>
        <div className="sidebar-footer"><div className="status-callout"><span className="live-pulse" /><div><strong>All systems ready</strong><small>Local demo environment</small></div></div><div className="user-card"><div className="user-avatar">{initials(user.name)}</div><div className="user-details"><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></div><LogoutButton /></div></div>
      </aside>
      <main className="main-content" id="main-content">{children}</main>
    </div>
  );
}
