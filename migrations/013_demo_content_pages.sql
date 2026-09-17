INSERT INTO content_pages
  (id, slug, title, excerpt, status, blocks_json, seo_title, seo_description, created_by, updated_by, created_at, updated_at, published_at)
VALUES
  ('page-demo-about', 'about-webinar-studio', 'About Webinar Studio', 'A sample page showing how reusable content blocks can explain the operating model.', 'published', '[{"id":"about-hero","type":"hero","data":{"eyebrow":"A clearer way to gather","heading":"Make every live session feel considered.","body":"Webinar Studio gives teams one calm place to plan, publish, and follow through on live learning experiences.","ctaLabel":"Browse sessions","ctaHref":"/webinars"}},{"id":"about-copy","type":"rich_text","data":{"heading":"Built around the work after the broadcast","body":"The session is only one part of the experience. Registration, communication, fulfillment, and replay access stay connected so the next step is easier to see."}},{"id":"about-cta","type":"cta","data":{"heading":"See the operating model in action.","body":"Explore the sample catalog and the service coverage patterns behind this standalone release.","buttonLabel":"Explore service locations","buttonHref":"/locations"}}]', 'About Webinar Studio', 'Learn how Webinar Studio connects live sessions, attendee operations, and follow-through.', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('page-demo-how-it-works', 'how-it-works', 'How it works', 'A sample campaign page assembled from the visual page editor.', 'published', '[{"id":"how-hero","type":"hero","data":{"eyebrow":"Simple by design","heading":"From invitation to replay, one connected flow.","body":"Publish a session, fill the room, deliver the experience, and keep the relationship moving after the live event.","ctaLabel":"View the product catalog","ctaHref":"/products"}},{"id":"how-copy","type":"rich_text","data":{"heading":"Compose pages without a plugin stack","body":"Administrators can add, edit, duplicate, reorder, preview, publish, archive, and delete content blocks from the standalone workspace."}},{"id":"how-space","type":"spacer","data":{"height":32}}]', 'How it works', 'See how the standalone platform connects sessions, commerce, and attendee operations.', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-about', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-about'
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-how-it-works', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-how-it-works'
ON CONFLICT (id) DO NOTHING;
