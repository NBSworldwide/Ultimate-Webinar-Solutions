import { cache } from "react";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";

export const navigationLocations = ["header", "footer", "mobile"] as const;
export type NavigationLocation = typeof navigationLocations[number];

export const navigationItemTypes = ["system", "page", "product", "product_category", "session", "session_category", "custom"] as const;
export type NavigationItemType = typeof navigationItemTypes[number];

export interface NavigationMenuItemView {
  id: string;
  parentId: string | null;
  label: string;
  href: string;
  itemType: NavigationItemType;
  entityId: string | null;
  openInNewTab: boolean;
  isVisible: boolean;
  sortOrder: number;
  autoAdded: boolean;
}

export interface NavigationMenuView {
  id: string;
  slug: string;
  name: string;
  locations: NavigationLocation[];
  autoAddPublishedPages: boolean;
  items: NavigationMenuItemView[];
  updatedAt: string;
}

export interface NavigationCandidate {
  key: string;
  label: string;
  href: string;
  itemType: Exclude<NavigationItemType, "custom">;
  entityId: string | null;
  group: string;
}

export interface NavigationItemInput {
  id?: string;
  parentId?: string | null;
  label: string;
  href: string;
  itemType: NavigationItemType;
  entityId?: string | null;
  openInNewTab?: boolean;
  isVisible?: boolean;
}

export interface NavigationMenuInput {
  name: string;
  locations: NavigationLocation[];
  autoAddPublishedPages: boolean;
  items: NavigationItemInput[];
}

type NavigationMenuRow = DatabaseRow & {
  id: string;
  slug: string;
  name: string;
  auto_add_published_pages: boolean | number;
  updated_at: string;
};

type NavigationLocationRow = DatabaseRow & { menu_id: string; location: NavigationLocation };

type NavigationItemRow = DatabaseRow & {
  id: string;
  menu_id: string;
  parent_id: string | null;
  label: string;
  href: string;
  item_type: NavigationItemType;
  entity_id: string | null;
  open_in_new_tab: boolean | number;
  is_visible: boolean | number;
  sort_order: number | string;
  auto_added: boolean | number;
};

const menuItemFields = `id, menu_id, parent_id, label, href, item_type, entity_id,
  open_in_new_tab, is_visible, sort_order, auto_added`;

function toMenuItem(row: NavigationItemRow): NavigationMenuItemView {
  return {
    id: row.id,
    parentId: row.parent_id,
    label: row.label,
    href: row.href,
    itemType: row.item_type,
    entityId: row.entity_id,
    openInNewTab: Boolean(row.open_in_new_tab),
    isVisible: Boolean(row.is_visible),
    sortOrder: Number(row.sort_order),
    autoAdded: Boolean(row.auto_added),
  };
}

function toMenu(row: NavigationMenuRow, locations: NavigationLocation[], items: NavigationMenuItemView[]): NavigationMenuView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locations,
    autoAddPublishedPages: Boolean(row.auto_add_published_pages),
    items,
    updatedAt: row.updated_at,
  };
}

export const getNavigationMenus = cache(async (): Promise<NavigationMenuView[]> => {
  await assertStandaloneDataset();
  const database = getDb();
  const [menuResult, locationResult, itemResult] = await Promise.all([
    database.query<NavigationMenuRow>("SELECT id, slug, name, auto_add_published_pages, updated_at FROM navigation_menus ORDER BY name"),
    database.query<NavigationLocationRow>("SELECT menu_id, location FROM navigation_menu_locations ORDER BY menu_id, location"),
    database.query<NavigationItemRow>(`SELECT ${menuItemFields} FROM navigation_menu_items ORDER BY menu_id, sort_order, label`),
  ]);
  const locationsByMenu = new Map<string, NavigationLocation[]>();
  for (const row of locationResult.rows) locationsByMenu.set(row.menu_id, [...(locationsByMenu.get(row.menu_id) ?? []), row.location]);
  const itemsByMenu = new Map<string, NavigationMenuItemView[]>();
  for (const row of itemResult.rows) itemsByMenu.set(row.menu_id, [...(itemsByMenu.get(row.menu_id) ?? []), toMenuItem(row)]);
  return menuResult.rows.map((row) => toMenu(row, locationsByMenu.get(row.id) ?? [], itemsByMenu.get(row.id) ?? []));
});

export async function getNavigationMenu(id: string): Promise<NavigationMenuView | null> {
  const menus = await getNavigationMenus();
  return menus.find((menu) => menu.id === id) ?? null;
}

export const getNavigationItemsForLocation = cache(async (location: NavigationLocation): Promise<NavigationMenuItemView[]> => {
  const menus = await getNavigationMenus();
  const menu = menus.find((candidate) => candidate.locations.includes(location));
  return menu?.items.filter((item) => item.isVisible) ?? [];
});

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `menu-${Date.now()}`;
}

function normalizeHref(value: string): string {
  const href = value.trim().slice(0, 500);
  if (!href || /[\r\n]/.test(href) || /^javascript:/i.test(href) || /^data:/i.test(href)) throw new DomainError("Menu links must use a safe internal path or an http(s) URL.");
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    return url.toString();
  } catch {
    throw new DomainError("Menu links must use a safe internal path or an http(s) URL.");
  }
}

type NormalizedNavigationItem = Required<NavigationItemInput> & { sortOrder: number };

function normalizeMenuInput(input: NavigationMenuInput): { name: string; locations: NavigationLocation[]; autoAddPublishedPages: boolean; items: NormalizedNavigationItem[] } {
  const name = input.name.trim().slice(0, 100);
  if (name.length < 2) throw new DomainError("A menu name is required.");
  const locations = [...new Set(input.locations)].filter((location): location is NavigationLocation => navigationLocations.includes(location));
  if (locations.length === 0) throw new DomainError("Assign the menu to at least one theme location.");
  if (!Array.isArray(input.items) || input.items.length > 100) throw new DomainError("A menu can contain at most 100 items.");
  const ids = new Set<string>();
  const items = input.items.map((item, index) => {
    const id = (item.id?.trim() || `navigation-item-${randomUUID()}`).slice(0, 120);
    if (ids.has(id)) throw new DomainError("A menu contains a duplicate item.");
    ids.add(id);
    if (!navigationItemTypes.includes(item.itemType)) throw new DomainError("A menu item type is invalid.");
    const label = item.label.trim().slice(0, 120);
    if (!label) throw new DomainError("Every menu item needs a label.");
    return {
      id,
      parentId: item.parentId?.trim() || null,
      label,
      href: normalizeHref(item.href),
      itemType: item.itemType,
      entityId: item.entityId?.trim() || null,
      openInNewTab: Boolean(item.openInNewTab),
      isVisible: item.isVisible !== false,
      sortOrder: index,
    };
  });
  const knownIds = new Set(items.map((item) => item.id));
  for (const item of items) {
    if (item.parentId && (!knownIds.has(item.parentId) || item.parentId === item.id)) throw new DomainError("A menu item has an invalid parent.");
    const seen = new Set<string>();
    let parent = item.parentId;
    while (parent) {
      if (seen.has(parent) || parent === item.id) throw new DomainError("Menu items cannot contain a circular hierarchy.");
      seen.add(parent);
      parent = items.find((candidate) => candidate.id === parent)?.parentId ?? null;
    }
  }
  return { name, locations, autoAddPublishedPages: Boolean(input.autoAddPublishedPages), items };
}

export async function createNavigationMenu(input: Pick<NavigationMenuInput, "name" | "locations" | "autoAddPublishedPages">, actorId: string): Promise<NavigationMenuView> {
  await assertStandaloneDataset();
  const name = input.name.trim().slice(0, 100);
  if (name.length < 2) throw new DomainError("A menu name is required.");
  const locations = [...new Set(input.locations)].filter((location): location is NavigationLocation => navigationLocations.includes(location));
  if (locations.length === 0) throw new DomainError("Assign the menu to at least one theme location.");
  const now = new Date().toISOString();
  const id = `navigation-menu-${randomUUID()}`;
  let slug = slugify(name);
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM navigation_menus WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;
    await client.query("INSERT INTO navigation_menus (id, slug, name, auto_add_published_pages, created_at, updated_at, updated_by) VALUES ($1,$2,$3,$4,$5,$5,$6)", [id, slug, name, Boolean(input.autoAddPublishedPages), now, actorId]);
    for (const location of locations) await client.query("INSERT INTO navigation_menu_locations (menu_id, location) VALUES ($1,$2)", [id, location]);
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'navigation.menu_created','navigation_menu',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, locations }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const result = await getNavigationMenu(id);
  if (!result) throw new DomainError("The menu was created but could not be loaded.", 500);
  return result;
}

export async function updateNavigationMenu(id: string, input: NavigationMenuInput, actorId: string): Promise<NavigationMenuView> {
  await assertStandaloneDataset();
  const menu = normalizeMenuInput(input);
  const now = new Date().toISOString();
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM navigation_menus WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new DomainError("The menu could not be found.", 404);
    await client.query("UPDATE navigation_menus SET name=$1, auto_add_published_pages=$2, updated_at=$3, updated_by=$4 WHERE id=$5", [menu.name, menu.autoAddPublishedPages, now, actorId, id]);
    await client.query("DELETE FROM navigation_menu_locations WHERE menu_id = $1", [id]);
    for (const location of menu.locations) await client.query("INSERT INTO navigation_menu_locations (menu_id, location) VALUES ($1,$2)", [id, location]);
    await client.query("DELETE FROM navigation_menu_items WHERE menu_id = $1", [id]);
    for (const item of menu.items) {
      await client.query("INSERT INTO navigation_menu_items (id, menu_id, parent_id, label, href, item_type, entity_id, open_in_new_tab, is_visible, sort_order, auto_added, created_at, updated_at) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,FALSE,$10,$10)", [item.id, id, item.label, item.href, item.itemType, item.entityId, item.openInNewTab, item.isVisible, item.sortOrder, now]);
    }
    for (const item of menu.items) {
      if (item.parentId) await client.query("UPDATE navigation_menu_items SET parent_id = $1 WHERE id = $2 AND menu_id = $3", [item.parentId, item.id, id]);
    }
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'navigation.menu_updated','navigation_menu',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true, itemCount: menu.items.length, locations: menu.locations }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("A menu item with that identity already exists.", 409);
    throw error;
  } finally {
    client.release();
  }
  const result = await getNavigationMenu(id);
  if (!result) throw new DomainError("The menu was updated but could not be loaded.", 500);
  return result;
}

export async function deleteNavigationMenu(id: string, actorId: string): Promise<void> {
  await assertStandaloneDataset();
  const database = getDb();
  const menu = await database.query<{ slug: string }>("SELECT slug FROM navigation_menus WHERE id = $1", [id]);
  if (!menu.rows[0]) throw new DomainError("The menu could not be found.", 404);
  if (["primary-navigation", "footer-navigation"].includes(menu.rows[0].slug)) throw new DomainError("The default public menus cannot be deleted. Clear or reassign their items instead.", 409);
  await database.query("DELETE FROM navigation_menus WHERE id = $1", [id]);
  await database.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'navigation.menu_deleted','navigation_menu',$3,$4,$5)", [randomUUID(), actorId, id, JSON.stringify({ synthetic: true }), new Date().toISOString()]);
}

export async function getNavigationCandidates(): Promise<NavigationCandidate[]> {
  await assertStandaloneDataset();
  const database = getDb();
  const [pages, products, categories, sessions, sessionCategories] = await Promise.all([
    database.query<{ id: string; title: string; slug: string }>("SELECT id, title, slug FROM content_pages WHERE status = 'published' ORDER BY title LIMIT 100"),
    database.query<{ id: string; name: string; slug: string }>("SELECT id, name, slug FROM products WHERE status = 'active' ORDER BY name LIMIT 100"),
    database.query<{ id: string; name: string; slug: string }>("SELECT id, name, slug FROM product_categories WHERE status = 'active' ORDER BY name LIMIT 100"),
    database.query<{ id: string; title: string; slug: string }>("SELECT id, title, slug FROM webinars WHERE status IN ('published','sold_out','completed') AND visibility = 'public' ORDER BY starts_at DESC LIMIT 100"),
    database.query<{ eyebrow: string }>("SELECT DISTINCT eyebrow FROM webinars WHERE status IN ('published','sold_out','completed') AND visibility = 'public' AND eyebrow <> '' ORDER BY eyebrow LIMIT 100"),
  ]);
  const system: NavigationCandidate[] = [
    ["sessions", "Sessions", "/webinars"], ["shop", "Shop", "/products"], ["cart", "Cart", "/cart"], ["account", "My account", "/account"],
    ["locations", "Service locations", "/locations"], ["privacy-policy", "Privacy Policy", "/privacy-policy"], ["terms-and-conditions", "Terms & Conditions", "/terms-and-conditions"],
    ["refund-policy", "Refund policy", "/refund-policy"], ["return-policy", "Return policy", "/return-policy"],
    ["shipping-policy", "Shipping policy", "/shipping-policy"], ["sign-in", "Sign in", "/login"],
  ].map(([id, label, href]) => ({ key: `system:${id}`, label, href, itemType: "system", entityId: id, group: "System links" }));
  return [
    ...system,
    ...pages.rows.map((page) => ({ key: `page:${page.id}`, label: page.title, href: `/pages/${page.slug}`, itemType: "page" as const, entityId: page.id, group: "Published pages" })),
    ...products.rows.map((product) => ({ key: `product:${product.id}`, label: product.name, href: `/products/${product.slug}`, itemType: "product" as const, entityId: product.id, group: "Products" })),
    ...categories.rows.map((category) => ({ key: `product-category:${category.id}`, label: category.name, href: `/products?category=${encodeURIComponent(category.slug)}`, itemType: "product_category" as const, entityId: category.id, group: "Product categories" })),
    ...sessions.rows.map((session) => ({ key: `session:${session.id}`, label: session.title, href: `/webinars/${session.slug}`, itemType: "session" as const, entityId: session.id, group: "Public sessions" })),
    ...sessionCategories.rows.map((category) => ({ key: `session-category:${category.eyebrow}`, label: category.eyebrow, href: `/webinars?category=${encodeURIComponent(category.eyebrow)}`, itemType: "session_category" as const, entityId: category.eyebrow, group: "Session categories" })),
  ];
}

export async function syncPublishedPageMenuItem(database: Pick<DatabaseClient, "query">, page: { id: string; slug: string; title: string; status: "draft" | "published" | "archived" }, now: string): Promise<void> {
  const menuResult = await database.query<{ id: string }>("SELECT id FROM navigation_menus WHERE slug = 'primary-navigation' AND auto_add_published_pages = TRUE LIMIT 1");
  const menuId = menuResult.rows[0]?.id;
  if (!menuId) return;
  const existing = await database.query<{ id: string }>("SELECT id FROM navigation_menu_items WHERE menu_id = $1 AND item_type = 'page' AND entity_id = $2 LIMIT 1", [menuId, page.id]);
  if (page.status === "published") {
    if (existing.rows[0]) {
      await database.query("UPDATE navigation_menu_items SET label=$1, href=$2, is_visible=TRUE, updated_at=$3 WHERE id=$4", [page.title, `/pages/${page.slug}`, now, existing.rows[0].id]);
    } else {
      const last = await database.query<{ sort_order: number | string }>("SELECT COALESCE(MAX(sort_order), 0)::int AS sort_order FROM navigation_menu_items WHERE menu_id = $1", [menuId]);
      await database.query("INSERT INTO navigation_menu_items (id, menu_id, label, href, item_type, entity_id, is_visible, sort_order, auto_added, created_at, updated_at) VALUES ($1,$2,$3,$4,'page',$5,TRUE,$6,TRUE,$7,$7)", [`navigation-page-${randomUUID()}`, menuId, page.title, `/pages/${page.slug}`, page.id, Number(last.rows[0]?.sort_order ?? 0) + 1, now]);
    }
  } else if (existing.rows[0]) {
    await database.query("UPDATE navigation_menu_items SET is_visible=FALSE, updated_at=$1 WHERE id=$2", [now, existing.rows[0].id]);
  }
}
