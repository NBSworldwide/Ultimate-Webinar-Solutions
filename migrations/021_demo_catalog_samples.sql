UPDATE products SET compare_at_price_cents = 2200, sale_price_cents = 1500, sale_starts_at = CURRENT_TIMESTAMP::text, sale_ends_at = (CURRENT_TIMESTAMP + INTERVAL '90 days')::text WHERE id = 'product-demo-field-notebook';
INSERT INTO product_variants (id, product_id, name, sku, option_values_json, price_cents, compare_at_price_cents, sale_price_cents, inventory_quantity, weight_grams, status, created_at, updated_at)
VALUES
  ('variant-demo-mic-standard', 'product-demo-mic-kit', 'Standard kit', 'WS-MIC-002-STD', '{"bundle":"Standard"}', 12900, NULL, NULL, 8, 640, 'active', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('variant-demo-mic-pro', 'product-demo-mic-kit', 'Presenter kit', 'WS-MIC-002-PRO', '{"bundle":"Presenter"}', 15900, 17900, 14900, 4, 720, 'active', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;
INSERT INTO product_brands (id, name, slug, description, created_at, updated_at) VALUES ('brand-demo-webinar-studio', 'Webinar Studio', 'webinar-studio', 'Synthetic sample brand for the standalone catalog.', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text) ON CONFLICT (id) DO NOTHING;
INSERT INTO product_categories (id, name, slug, description, created_at, updated_at) VALUES
  ('category-demo-workbooks', 'Workbooks', 'workbooks', 'Printed planning and session materials.', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('category-demo-production', 'Production gear', 'production-gear', 'Tools that support live presentation quality.', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('category-demo-event-kits', 'Event kits', 'event-kits', 'Materials prepared for attendees and hosts.', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;
INSERT INTO product_tags (id, name, slug, created_at) VALUES
  ('tag-demo-featured', 'Featured', 'featured', CURRENT_TIMESTAMP::text),
  ('tag-demo-sale', 'Sale', 'sale', CURRENT_TIMESTAMP::text),
  ('tag-demo-ships', 'Ships separately', 'ships-separately', CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;
INSERT INTO product_attributes (id, name, slug, display_type, created_at, updated_at) VALUES
  ('attribute-demo-bundle', 'Bundle', 'bundle', 'select', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('attribute-demo-color', 'Color', 'color', 'color', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;
INSERT INTO product_attribute_values (id, attribute_id, value, slug) VALUES
  ('attribute-value-demo-standard', 'attribute-demo-bundle', 'Standard', 'standard'),
  ('attribute-value-demo-presenter', 'attribute-demo-bundle', 'Presenter', 'presenter'),
  ('attribute-value-demo-black', 'attribute-demo-color', 'Black', 'black')
ON CONFLICT (id) DO NOTHING;
INSERT INTO product_tag_links (product_id, tag_id) VALUES
  ('product-demo-field-notebook', 'tag-demo-featured'),
  ('product-demo-field-notebook', 'tag-demo-sale'),
  ('product-demo-mic-kit', 'tag-demo-featured')
ON CONFLICT DO NOTHING;
