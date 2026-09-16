"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CircleHelp, LayoutDashboard, Layers3, Settings2, Sparkles, UsersRound } from "lucide-react";
import type { User } from "@/lib/types";
import { initials } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/webinars", label: "Webinars", icon: CalendarDays },
  { href: "/admin/registrations", label: "Registrations", icon: UsersRound },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/playbooks", label: "Playbooks", icon: Layers3 },
];

export function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div><span className="brand-name">Webinar</span><span className="brand-subtitle">Studio</span></div>
        </div>
        <div className="workspace-switcher"><span className="workspace-avatar">WS</span><span><strong>Webinar workspace</strong><small>Standalone release</small></span><span className="workspace-caret">⌄</span></div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span></Link>;
          })}
          <p className="nav-label nav-label-spaced">Manage</p>
          <Link href="/admin/settings" className={`nav-item ${pathname.startsWith("/admin/settings") ? "nav-item-active" : ""}`}><Settings2 size={18} /><span>Settings</span></Link>
          <Link href="/admin/help" className={`nav-item ${pathname.startsWith("/admin/help") ? "nav-item-active" : ""}`}><CircleHelp size={18} /><span>Help center</span></Link>
        </nav>
        <div className="sidebar-footer"><div className="status-callout"><span className="live-pulse" /><div><strong>All systems ready</strong><small>Local demo environment</small></div></div><div className="user-card"><div className="user-avatar">{initials(user.name)}</div><div className="user-details"><strong>{user.name}</strong><small>{user.role === "admin" ? "Workspace admin" : "Attendee"}</small></div><LogoutButton /></div></div>
      </aside>
      <main className="main-content" id="main-content">{children}</main>
    </div>
  );
}
