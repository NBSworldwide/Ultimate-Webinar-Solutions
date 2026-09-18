INSERT INTO content_pages
  (id, slug, title, excerpt, status, blocks_json, seo_title, seo_description, created_by, updated_by, created_at, updated_at, published_at)
VALUES
  ('page-demo-home', 'home', 'Webinar Studio', 'The editable landing page for the standalone Webinar Studio workspace.', 'published', '[{"id":"home-hero","type":"hero","data":{"eyebrow":"Live learning, made practical","heading":"Make the room work for people.","body":"Build thoughtful sessions, give every attendee a clear next step, and keep the work connected after the broadcast.","ctaLabel":"Explore live sessions","ctaHref":"/webinars"}},{"id":"home-form","type":"form","data":{"heading":"Tell us what you need","formSlug":"session-request"}},{"id":"home-products","type":"product_grid","data":{"heading":"Tools for the work around the session","maxItems":3}},{"id":"home-copy","type":"rich_text","data":{"heading":"One calm operating flow","body":"From the first invitation to replay access, Webinar Studio keeps the details visible without turning the experience into a stack of disconnected tools."}},{"id":"home-cta","type":"cta","data":{"heading":"Ready for a better live experience?","body":"Browse the next sessions or open the studio workspace to shape the public experience.","buttonLabel":"View the schedule","buttonHref":"/webinars"}}]}', 'Webinar Studio', 'Practical live learning experiences with a clear path from invitation to replay.', NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-home', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-home'
ON CONFLICT (id) DO NOTHING;
