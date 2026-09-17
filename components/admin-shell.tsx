"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CircleHelp, ClipboardList, ContactRound, FileText, LayoutDashboard, Layers3, LockKeyhole, Mail, MessageSquareText, Package, Percent, Settings2, Sparkles, UsersRound, Warehouse } from "lucide-react";
import type { User } from "@/lib/types";
import type { SiteSettings } from "@/lib/types";
import { initials } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";

const navigationGroups = [
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText },
      { href: "/admin/webinars", label: "Webinars", icon: CalendarDays },
      { href: "/admin/private-webinars", label: "Private webinars", icon: LockKeyhole },
      { href: "/admin/playbooks", label: "Playbooks", icon: Layers3 },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/products/brands", label: "Brands", icon: Package },
      { href: "/admin/products/categories", label: "Categories", icon: Package },
      { href: "/admin/products/tags", label: "Tags", icon: Package },
      { href: "/admin/products/attributes", label: "Attributes", icon: Package },
      { href: "/admin/products/reviews", label: "Reviews", icon: Package },
      { href: "/admin/coupons", label: "Coupons", icon: Percent },
      { href: "/admin/inventory", label: "Inventory sources", icon: Warehouse },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
    ],
  },
  {
    label: "People & messaging",
    items: [
      { href: "/admin/registrations", label: "Registrations", icon: UsersRound },
      { href: "/admin/crm", label: "CRM", icon: ContactRound },
      { href: "/admin/email", label: "Email", icon: Mail },
      { href: "/admin/sms", label: "SMS", icon: MessageSquareText },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 }],
  },
];

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
          {navigationGroups.map((group) => <div key={group.label} className="nav-group"><p className="nav-label nav-label-spaced">{group.label}</p>{group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span></Link>;
          })}</div>)}
          <p className="nav-label nav-label-spaced">System</p>
          <Link href="/admin/settings" className={`nav-item ${pathname.startsWith("/admin/settings") ? "nav-item-active" : ""}`}><Settings2 size={18} /><span>Settings</span></Link>
          <Link href="/admin/help" className={`nav-item ${pathname.startsWith("/admin/help") ? "nav-item-active" : ""}`}><CircleHelp size={18} /><span>Help center</span></Link>
        </nav>
        <div className="sidebar-footer"><div className="status-callout"><span className="live-pulse" /><div><strong>All systems ready</strong><small>Local demo environment</small></div></div><div className="user-card"><div className="user-avatar">{initials(user.name)}</div><div className="user-details"><strong>{user.name}</strong><small>{user.role === "admin" ? "Workspace admin" : "Attendee"}</small></div><LogoutButton /></div></div>
      </aside>
      <main className="main-content" id="main-content">{children}</main>
    </div>
  );
}
