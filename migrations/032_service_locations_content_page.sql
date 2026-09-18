INSERT INTO content_pages
  (id, slug, title, excerpt, status, blocks_json, seo_title, seo_description, created_by, updated_by, created_at, updated_at, published_at)
VALUES
  ('page-demo-service-locations', 'service-locations', 'Service locations', 'Editable service-area coverage examples for the standalone Webinar Studio release.', 'published', '[{"id":"locations-hero","type":"hero","data":{"eyebrow":"Virtual-first coverage","heading":"Service locations that keep the room in sync.","body":"Explore sample service-area pages for teams planning briefings, interactive labs, and tabletop workshops across different time zones.","ctaLabel":"Browse live sessions","ctaHref":"/webinars"}},{"id":"locations-directory","type":"location_index","data":{"heading":"Sample service locations"}},{"id":"locations-principles","type":"rich_text","data":{"heading":"One operating model","body":"Useful context, wherever the team is. Every session stores its UTC start time together with an IANA timezone for a clear attendee experience. Facilitation patterns make space for questions, decisions, and a concrete next step. Registration, delivery, and replay handoffs have an observable home in the operations workspace."}},{"id":"locations-cta","type":"cta","data":{"heading":"Plan the next room with more clarity.","body":"Start with a sample session, then refine the public experience in the page builder.","buttonLabel":"Open the schedule","buttonHref":"/webinars"}}]', 'Service locations', 'Virtual-first webinar facilitation and operations coverage examples for teams in selected U.S. time zones.', NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-service-locations', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-service-locations'
ON CONFLICT (id) DO NOTHING;
