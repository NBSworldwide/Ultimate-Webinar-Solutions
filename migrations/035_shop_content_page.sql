INSERT INTO content_pages
  (id, slug, title, excerpt, status, blocks_json, seo_title, seo_description, created_by, updated_by, created_at, updated_at, published_at)
VALUES
  ('page-demo-shop', 'products', 'Shop', 'The editable storefront for products that extend the standalone Webinar Studio experience.', 'published', '[{"id":"shop-hero","type":"hero","data":{"eyebrow":"Physical goods","heading":"Products that extend the session.","body":"Browse standalone merchandise, production gear, and attendee kits. Each item can be purchased independently from a webinar registration.","ctaLabel":"Explore live sessions","ctaHref":"/webinars"}},{"id":"shop-note","type":"rich_text","data":{"heading":"A storefront built around the experience.","body":"These products are synthetic samples with server-authoritative inventory. Product details, pricing, and fulfillment records remain managed in the commerce workspace."}},{"id":"shop-products","type":"product_grid","data":{"heading":"Browse the collection","maxItems":12}},{"id":"shop-cta","type":"cta","data":{"heading":"Need a room before you need the gear?","body":"Pair the right kit with an upcoming live session, then keep the next step visible for every attendee.","buttonLabel":"View the schedule","buttonHref":"/webinars"}}]}', 'Shop | Webinar Studio', 'Browse physical products and shipped attendee kits from Webinar Studio.', NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-shop', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-shop'
ON CONFLICT (id) DO NOTHING;
