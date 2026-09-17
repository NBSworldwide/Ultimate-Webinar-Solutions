CREATE TABLE IF NOT EXISTS navigation_menus (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  auto_add_published_pages BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS navigation_menu_locations (
  menu_id TEXT NOT NULL REFERENCES navigation_menus(id) ON DELETE CASCADE,
  location TEXT NOT NULL CHECK (location IN ('header', 'footer', 'mobile')),
  PRIMARY KEY (menu_id, location)
);

CREATE TABLE IF NOT EXISTS navigation_menu_items (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES navigation_menus(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('system', 'page', 'product', 'product_category', 'session', 'session_category', 'custom')),
  entity_id TEXT,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  auto_added BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (menu_id, item_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_navigation_menu_locations_location
  ON navigation_menu_locations(location, menu_id);

CREATE INDEX IF NOT EXISTS idx_navigation_menu_items_menu_order
  ON navigation_menu_items(menu_id, parent_id, sort_order, label);

INSERT INTO navigation_menus (id, slug, name, auto_add_published_pages, created_at, updated_at)
VALUES
  ('navigation-menu-primary', 'primary-navigation', 'Primary navigation', TRUE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-menu-footer', 'footer-navigation', 'Footer navigation', FALSE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO navigation_menu_locations (menu_id, location)
VALUES
  ('navigation-menu-primary', 'header'),
  ('navigation-menu-primary', 'mobile'),
  ('navigation-menu-footer', 'footer')
ON CONFLICT DO NOTHING;

INSERT INTO navigation_menu_items
  (id, menu_id, label, href, item_type, entity_id, sort_order, created_at, updated_at)
VALUES
  ('navigation-primary-sessions', 'navigation-menu-primary', 'Sessions', '/webinars', 'system', 'sessions', 0, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-shop', 'navigation-menu-primary', 'Shop', '/products', 'system', 'shop', 1, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-cart', 'navigation-menu-primary', 'Cart', '/cart', 'system', 'cart', 2, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-account', 'navigation-menu-primary', 'My account', '/account', 'system', 'account', 3, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-locations', 'navigation-menu-primary', 'Service locations', '/locations', 'system', 'locations', 4, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-signin', 'navigation-menu-primary', 'Sign in', '/login', 'system', 'sign-in', 5, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-sessions', 'navigation-menu-footer', 'Sessions', '/webinars', 'system', 'sessions', 0, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-shop', 'navigation-menu-footer', 'Shop', '/products', 'system', 'shop', 1, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-refunds', 'navigation-menu-footer', 'Refund policy', '/refund-policy', 'system', 'refund-policy', 2, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-returns', 'navigation-menu-footer', 'Return policy', '/return-policy', 'system', 'return-policy', 3, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-shipping', 'navigation-menu-footer', 'Shipping policy', '/shipping-policy', 'system', 'shipping-policy', 4, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-signin', 'navigation-menu-footer', 'Admin sign in', '/login', 'system', 'sign-in', 5, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO navigation_menu_items
  (id, menu_id, parent_id, label, href, item_type, entity_id, sort_order, auto_added, created_at, updated_at)
SELECT
  'navigation-primary-page-' || p.id,
  'navigation-menu-primary',
  NULL,
  p.title,
  '/pages/' || p.slug,
  'page',
  p.id,
  100 + ROW_NUMBER() OVER (ORDER BY p.title),
  TRUE,
  CURRENT_TIMESTAMP::text,
  CURRENT_TIMESTAMP::text
FROM content_pages p
WHERE p.status = 'published'
ON CONFLICT (menu_id, item_type, entity_id) DO NOTHING;
