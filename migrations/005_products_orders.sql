CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  inventory_quantity INTEGER NOT NULL CHECK (inventory_quantity >= 0),
  weight_grams INTEGER NOT NULL DEFAULT 0 CHECK (weight_grams >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_status_category ON products(status, category, name);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT NOT NULL DEFAULT '',
  shipping_city TEXT NOT NULL,
  shipping_region TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL CHECK (shipping_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents = subtotal_cents + shipping_cents),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'packing', 'shipped', 'delivered', 'cancelled')),
  tracking_carrier TEXT,
  tracking_number TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_email, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_created ON orders(fulfillment_status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents = quantity * unit_price_cents)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

INSERT INTO products
  (id, slug, name, sku, description, details, category, image_url, price_cents, inventory_quantity, weight_grams, status, created_at, updated_at)
VALUES
  ('product-demo-field-notebook', 'field-notebook', 'Field Notes Workbook', 'WS-FNW-001', 'A durable session workbook for notes, prompts, and action plans.', 'Synthetic sample product for the standalone commerce demo. Ships flat in a recyclable mailer.', 'Workbooks', NULL, 1800, 42, 280, 'active', NOW()::text, NOW()::text),
  ('product-demo-mic-kit', 'mobile-mic-kit', 'Mobile Presenter Mic Kit', 'WS-MIC-002', 'A compact microphone kit for clearer live presentations and recordings.', 'Synthetic sample product. Includes a carry pouch and setup card; fulfillment is represented by the admin workflow.', 'Production gear', NULL, 12900, 12, 640, 'active', NOW()::text, NOW()::text),
  ('product-demo-welcome-pack', 'welcome-pack', 'Attendee Welcome Pack', 'WS-WEL-003', 'A small printed welcome pack for teams attending a private session.', 'Synthetic sample product with printed materials and a reusable badge sleeve.', 'Event kits', NULL, 2400, 65, 190, 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
