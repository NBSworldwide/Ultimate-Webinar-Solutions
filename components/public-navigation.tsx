import Link from "next/link";
import { ArrowUpRight, ChevronDown, ShoppingCart } from "lucide-react";
import type { NavigationMenuItemView } from "@/lib/navigation";

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function NavigationItemLink({ item, className = "" }: { item: NavigationMenuItemView; className?: string }) {
  const content = <>{item.href === "/cart" ? <ShoppingCart size={15} aria-hidden="true" /> : null}<span>{item.label}</span>{item.href === "/login" ? <ArrowUpRight size={15} aria-hidden="true" /> : null}</>;
  const classes = [className, item.href === "/login" ? "public-login" : ""].filter(Boolean).join(" ");
  if (isExternal(item.href)) return <a className={classes || undefined} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noreferrer" : undefined}>{content}</a>;
  return <Link className={classes || undefined} href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noreferrer" : undefined}>{content}</Link>;
}

function MenuItem({ item, items, nested = false }: { item: NavigationMenuItemView; items: NavigationMenuItemView[]; nested?: boolean }) {
  const children = items.filter((candidate) => candidate.parentId === item.id && candidate.isVisible).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  if (children.length === 0) return <NavigationItemLink item={item} className={nested ? "public-nav-subitem" : ""} />;
  return <details className={nested ? "public-nav-subgroup" : "public-nav-group"}><summary>{item.label}<ChevronDown size={14} aria-hidden="true" /></summary><div className="public-nav-submenu">{children.map((child) => <MenuItem key={child.id} item={child} items={items} nested />)}</div></details>;
}

export function PublicNavigation({ items, ariaLabel, className = "" }: { items: NavigationMenuItemView[]; ariaLabel: string; className?: string }) {
  const visibleItems = items.filter((item) => item.isVisible);
  const roots = visibleItems.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return <nav className={className ? `public-nav ${className}` : "public-nav"} aria-label={ariaLabel}>{roots.map((item) => <MenuItem key={item.id} item={item} items={visibleItems} />)}</nav>;
}
