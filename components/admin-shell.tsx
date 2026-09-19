"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, ChevronRight, CircleHelp, ClipboardList, ClipboardPenLine, ContactRound, FileText, Images, LayoutDashboard, LayoutTemplate, Layers3, LockKeyhole, Mail, MapPin, Menu, MessageSquareText, Package, Percent, Plus, Settings2, Sparkles, UserRound, UsersRound, Warehouse, type LucideIcon } from "lucide-react";
import type { User } from "@/lib/types";
import type { SiteSettings } from "@/lib/types";
import { hasCapability, roleLabel, type Capability } from "@/lib/authorization";
import { initials } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";

const navigationGroups = [
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, capability: "content.manage" },
      { href: "/admin/locations", label: "Service locations", icon: MapPin, capability: "content.manage" },
      { href: "/admin/forms", label: "Forms", icon: ClipboardPenLine, capability: "forms.manage" },
      { href: "/admin/registrations", label: "Session users", icon: UsersRound, capability: "registrations.view" },
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
    label: "Customers",
    items: [
      { href: "/admin/crm", label: "CRM", icon: ContactRound, capability: "crm.manage" },
      { href: "/admin/email", label: "Email", icon: Mail, capability: "email.manage" },
      { href: "/admin/sms", label: "SMS", icon: MessageSquareText, capability: "messaging.manage" },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3, capability: "analytics.view" }],
  },
  {
    label: "Appearance",
    items: [
      { href: "/admin/appearance", label: "Site identity", icon: Settings2, capability: "appearance.manage" },
      { href: "/admin/navigation", label: "Navigation", icon: Menu, capability: "appearance.manage" },
      { href: "/admin/appearance/templates", label: "Header & Footer", icon: LayoutTemplate, capability: "appearance.manage" },
      { href: "/admin/settings", label: "Site settings", icon: Settings2, capability: "settings.manage" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/account", label: "My account", icon: UserRound },
      { href: "/admin/media", label: "Media library", icon: Images, capability: "media.manage" },
      { href: "/admin/team", label: "Users", icon: UsersRound, capability: "team.view" },
      { href: "/admin/help", label: "Help center", icon: CircleHelp },
    ],
  },
] as const;

type NavigationGroup = (typeof navigationGroups)[number];
type NavigationItem = NavigationGroup["items"][number];
type NavigationLinkItem = { href: string; label: string; icon: LucideIcon; capability?: Capability };
type CollapsibleNavigationLabel = "Pages" | "Webinars" | "Commerce" | "Customers" | "Insights" | "Appearance" | "System";
type NavigationGroupDescriptor = { label: CollapsibleNavigationLabel; icon: LucideIcon };
type NestedNavigationGroup = { label: string; icon: LucideIcon; items: readonly NavigationLinkItem[] };

const pagesNavigationGroup: NavigationGroupDescriptor = { label: "Pages", icon: FileText };
const pagesNavigationItems: readonly NavigationLinkItem[] = [
  { href: "/admin/pages", label: "All pages", icon: FileText, capability: "content.manage" },
  { href: "/admin/pages/new", label: "Add page", icon: Plus, capability: "content.manage" },
];

function isNavigationMatch(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canSeeNavigationItem(user: User, item: NavigationItem | NavigationLinkItem) {
  if (!("capability" in item) || !item.capability) return true;
  return hasCapability(user, item.capability);
}

function getOpenNavigationGroup(pathname: string): CollapsibleNavigationLabel | null {
  if (["/admin/pages", "/admin/pages/new"].some((href) => isNavigationMatch(pathname, href))) return "Pages";
  if (["/admin/webinars", "/admin/private-webinars", "/admin/playbooks", "/admin/registrations"].some((href) => isNavigationMatch(pathname, href))) return "Webinars";
  if (["/admin/products", "/admin/coupons", "/admin/inventory", "/admin/orders"].some((href) => isNavigationMatch(pathname, href))) return "Commerce";
  if (["/admin/crm", "/admin/email", "/admin/sms"].some((href) => isNavigationMatch(pathname, href))) return "Customers";
  if (isNavigationMatch(pathname, "/admin/analytics")) return "Insights";
  if (["/admin/navigation", "/admin/appearance", "/admin/appearance/templates", "/admin/settings"].some((href) => isNavigationMatch(pathname, href))) return "Appearance";
  if (["/account", "/admin/media", "/admin/team", "/admin/help"].some((href) => isNavigationMatch(pathname, href))) return "System";
  return null;
}

function CollapsibleNavGroup({ group, visibleItems, pathname, openGroup, onExpandedChange, compact = false, nestedGroup }: { group: NavigationGroupDescriptor; visibleItems: readonly NavigationLinkItem[]; pathname: string; openGroup: CollapsibleNavigationLabel | null; onExpandedChange: (label: CollapsibleNavigationLabel, open: boolean) => void; compact?: boolean; nestedGroup?: NestedNavigationGroup }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutFrameRef = useRef<number | null>(null);
  const flyoutHideTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const allItems = nestedGroup ? [...visibleItems, ...nestedGroup.items] : visibleItems;
  const activeHref = allItems.filter(({ href }) => isNavigationMatch(pathname, href)).sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const groupId = `nav-group-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const GroupIcon = group.icon;
  const NestedGroupIcon = nestedGroup?.icon;
  const isExpanded = openGroup === group.label;

  function updateFlyoutPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    const sidebarRect = triggerRef.current?.closest(".sidebar")?.getBoundingClientRect();
    if (rect) setFlyoutPosition({ top: rect.top, left: (sidebarRect?.right ?? rect.right) - 2 });
  }

  function clearFlyoutHideTimer() {
    if (flyoutHideTimerRef.current !== null) {
      window.clearTimeout(flyoutHideTimerRef.current);
      flyoutHideTimerRef.current = null;
    }
  }

  function showFlyout() {
    clearFlyoutHideTimer();
    if (isExpanded) {
      hideFlyout();
      return;
    }
    updateFlyoutPosition();
    if (flyoutFrameRef.current !== null) cancelAnimationFrame(flyoutFrameRef.current);
    flyoutFrameRef.current = requestAnimationFrame(() => {
      flyoutFrameRef.current = null;
      updateFlyoutPosition();
    });
  }

  function hideFlyout() {
    clearFlyoutHideTimer();
    if (flyoutFrameRef.current !== null) {
      cancelAnimationFrame(flyoutFrameRef.current);
      flyoutFrameRef.current = null;
    }
    setFlyoutPosition(null);
  }

  function scheduleFlyoutHide() {
    clearFlyoutHideTimer();
    flyoutHideTimerRef.current = window.setTimeout(() => {
      flyoutHideTimerRef.current = null;
      hideFlyout();
    }, 120);
  }

  return <div className={`nav-group nav-group-collapsible ${compact ? "nav-group-collapsible-compact" : ""} ${isExpanded ? "is-expanded" : ""} ${flyoutPosition && !isExpanded ? "has-flyout" : ""}`} onMouseEnter={showFlyout} onMouseLeave={scheduleFlyoutHide} onFocusCapture={showFlyout} onBlurCapture={(event) => { const next = event.relatedTarget as HTMLElement | null; if (!next || (!(event.currentTarget as HTMLElement).contains(next) && !next.closest(".nav-flyout"))) hideFlyout(); }}>
    <button ref={triggerRef} type="button" className={`nav-group-trigger ${activeHref ? "nav-group-trigger-active" : ""}`} aria-expanded={isExpanded} aria-controls={groupId} onClick={() => { onExpandedChange(group.label, !isExpanded); hideFlyout(); }} onKeyDown={(event) => { if (event.key === "Escape") hideFlyout(); }}>
      <GroupIcon size={18} strokeWidth={activeHref ? 2.3 : 1.8} /><span>{group.label}</span><ChevronDown className="nav-group-chevron" size={15} aria-hidden="true" />
    </button>
    <div id={groupId} className="nav-group-items">
      {nestedGroup && NestedGroupIcon ? <div className="nav-nested-group" role="group" aria-label={nestedGroup.label}>
        <div className="nav-nested-label"><NestedGroupIcon size={17} strokeWidth={1.9} /><span>{nestedGroup.label}</span></div>
        <div className="nav-nested-items">
          {nestedGroup.items.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => onExpandedChange(group.label, true)} />)}
        </div>
      </div> : null}
      {visibleItems.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return <Link key={href} href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span></Link>;
      })}
    </div>
    {flyoutPosition && !isExpanded && typeof document !== "undefined" ? createPortal(<div className="nav-flyout" style={{ top: flyoutPosition.top, left: flyoutPosition.left }} role="menu" aria-label={`${group.label} menu`} onMouseEnter={showFlyout} onMouseLeave={scheduleFlyoutHide} onFocusCapture={showFlyout} onBlurCapture={(event) => { const next = event.relatedTarget as HTMLElement | null; if (!next || (!(event.currentTarget as HTMLElement).contains(next) && !next.closest(".nav-group-collapsible"))) hideFlyout(); }}>
      <span className="nav-flyout-title">{group.label}</span>
      {nestedGroup && NestedGroupIcon ? <div className="nav-flyout-nested-group" role="group" aria-label={nestedGroup.label}>
        <span className="nav-flyout-nested-title"><NestedGroupIcon size={15} strokeWidth={1.9} /><span>{nestedGroup.label}</span></span>
        {nestedGroup.items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="nav-flyout-link" role="menuitem" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); onExpandedChange(group.label, true); hideFlyout(); router.push(href); }}><Icon size={16} /><span>{label}</span><ChevronRight size={14} aria-hidden="true" /></Link>)}
      </div> : null}
      {visibleItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="nav-flyout-link" role="menuitem" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); onExpandedChange(group.label, true); hideFlyout(); router.push(href); }}><Icon size={16} /><span>{label}</span><ChevronRight size={14} aria-hidden="true" /></Link>)}
    </div>, document.body) : null}
  </div>;
}

function NavigationLink({ item, pathname, onNavigate, topLevel = false }: { item: NavigationLinkItem; pathname: string; onNavigate?: () => void; topLevel?: boolean }) {
  const active = isNavigationMatch(pathname, item.href);
  const Icon = item.icon;
  return <Link href={item.href} className={`nav-item ${topLevel ? "nav-item-top-level" : ""} ${active ? "nav-item-active" : ""}`} onClick={onNavigate}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{item.label}</span></Link>;
}

const webinarsNavigationGroup: NavigationGroupDescriptor = { label: "Webinars", icon: CalendarDays };

export function AdminShell({ user, settings, children }: { user: User; settings: SiteSettings; children: React.ReactNode }) {
  const pathname = usePathname();
  const [openNavigationGroup, setOpenNavigationGroup] = useState<CollapsibleNavigationLabel | null>(() => getOpenNavigationGroup(pathname));

  function handleGroupExpandedChange(label: CollapsibleNavigationLabel, open: boolean) {
    setOpenNavigationGroup(open ? label : null);
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt={settings.logoAlt || settings.displayName} width={24} height={24} /> : <Sparkles size={18} />}</div>
          <div><span className="brand-name">{settings.displayName}</span><span className="brand-subtitle">Admin workspace</span></div>
        </div>
        <div className="sidebar-top-user"><div className="user-card"><div className="user-avatar">{initials(user.name)}</div><div className="user-details"><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></div></div><div className="sidebar-top-actions"><LogoutButton /></div></div>
        <nav key={pathname} className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Dashboard</p>
          <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "nav-item-active" : ""}`} onClick={() => setOpenNavigationGroup(null)}><LayoutDashboard size={18} strokeWidth={pathname === "/admin" ? 2.3 : 1.8} /><span>Overview</span></Link>
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canSeeNavigationItem(user, item));
            if (visibleItems.length === 0) return null;
            if (group.label === "Content") {
              const pagesItem = visibleItems.find(({ href }) => href === "/admin/pages");
              const directItems = visibleItems.filter(({ href }) => href !== "/admin/pages" && !["/admin/webinars", "/admin/private-webinars", "/admin/playbooks", "/admin/registrations"].includes(href));
              const webinarItems = visibleItems.filter(({ href }) => ["/admin/webinars", "/admin/private-webinars", "/admin/playbooks", "/admin/registrations"].includes(href));
              return <div key={group.label} className="nav-group"><p className="nav-label nav-label-spaced">{group.label}</p>{pagesItem ? <CollapsibleNavGroup group={pagesNavigationGroup} visibleItems={pagesNavigationItems} pathname={pathname} openGroup={openNavigationGroup} onExpandedChange={handleGroupExpandedChange} compact /> : null}{directItems.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpenNavigationGroup(null)} />)}{webinarItems.length > 0 ? <CollapsibleNavGroup group={webinarsNavigationGroup} visibleItems={webinarItems} pathname={pathname} openGroup={openNavigationGroup} onExpandedChange={handleGroupExpandedChange} compact /> : null}</div>;
            }
            if (["Commerce", "Customers", "Insights", "Appearance", "System"].includes(group.label)) {
              const groupIcon = group.label === "Commerce" ? Package : group.label === "Insights" ? BarChart3 : group.label === "System" || group.label === "Appearance" ? Settings2 : UsersRound;
              return <CollapsibleNavGroup key={group.label} group={{ label: group.label, icon: groupIcon }} visibleItems={visibleItems} pathname={pathname} openGroup={openNavigationGroup} onExpandedChange={handleGroupExpandedChange} />;
            }
            return <div key={group.label} className="nav-group"><p className="nav-label nav-label-spaced">{group.label}</p>{visibleItems.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpenNavigationGroup(null)} />)}</div>;
          })}
        </nav>
        <div className="sidebar-footer"><div className="status-callout"><span className="live-pulse" /><div><strong>All systems ready</strong><small>Local demo environment</small></div></div></div>
      </aside>
      <main className="main-content" id="main-content">{children}</main>
    </div>
  );
}
