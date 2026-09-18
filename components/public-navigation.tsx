import Link from "next/link";
import { ArrowUpRight, ChevronDown, LogOut, ShoppingCart } from "lucide-react";
import type { NavigationMenuItemView } from "@/lib/navigation";

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isSignInItem(item: NavigationMenuItemView): boolean {
  return item.itemType === "system" && item.entityId === "sign-in";
}

export function NavigationItemLink({ item, className = "", isAuthenticated = false }: { item: NavigationMenuItemView; className?: string; isAuthenticated?: boolean }) {
  const isSignOut = isAuthenticated && isSignInItem(item);
  const content = <>{item.href === "/cart" ? <ShoppingCart size={15} aria-hidden="true" /> : null}{isSignOut ? <LogOut size={15} aria-hidden="true" /> : null}<span>{isSignOut ? "Sign out" : item.label}</span>{!isSignOut && item.href === "/login" ? <ArrowUpRight size={15} aria-hidden="true" /> : null}</>;
  const classes = [className, item.href === "/login" || isSignOut ? "public-login" : ""].filter(Boolean).join(" ");
  if (isSignOut) return <form className="public-nav-action" action="/api/auth/logout" method="post"><button className={classes || undefined} type="submit">{content}</button></form>;
  if (isExternal(item.href)) return <a className={classes || undefined} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noreferrer" : undefined}>{content}</a>;
  return <Link className={classes || undefined} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noreferrer" : undefined}>{content}</Link>;
}

function MenuItem({ item, items, nested = false, isAuthenticated }: { item: NavigationMenuItemView; items: NavigationMenuItemView[]; nested?: boolean; isAuthenticated: boolean }) {
  const children = items.filter((candidate) => candidate.parentId === item.id && candidate.isVisible).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  if (children.length === 0) return <NavigationItemLink item={item} className={nested ? "public-nav-subitem" : ""} isAuthenticated={isAuthenticated} />;
  return <details className={nested ? "public-nav-subgroup" : "public-nav-group"}><summary>{item.label}<ChevronDown size={14} aria-hidden="true" /></summary><div className="public-nav-submenu">{children.map((child) => <MenuItem key={child.id} item={child} items={items} nested isAuthenticated={isAuthenticated} />)}</div></details>;
}

export function PublicNavigation({ items, ariaLabel, className = "", isAuthenticated = false }: { items: NavigationMenuItemView[]; ariaLabel: string; className?: string; isAuthenticated?: boolean }) {
  const visibleItems = items.filter((item) => item.isVisible);
  const roots = visibleItems.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return <nav className={className ? `public-nav ${className}` : "public-nav"} aria-label={ariaLabel}>{roots.map((item) => <MenuItem key={item.id} item={item} items={visibleItems} isAuthenticated={isAuthenticated} />)}</nav>;
}
