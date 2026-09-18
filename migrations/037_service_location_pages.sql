CREATE TABLE IF NOT EXISTS service_locations (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL UNIQUE REFERENCES content_pages(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  timezone TEXT NOT NULL,
  accent TEXT NOT NULL CHECK (accent IN ('teal', 'coral', 'gold')),
  eyebrow TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  best_for_json TEXT NOT NULL DEFAULT '[]',
  delivery_modes_json TEXT NOT NULL DEFAULT '[]',
  faqs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_locations_city ON service_locations(city, region);

INSERT INTO content_pages
  (id, slug, title, excerpt, status, blocks_json, seo_title, seo_description, is_homepage, created_by, updated_by, created_at, updated_at, published_at)
VALUES
  ('page-demo-location-chicago-il', 'location-chicago-il', 'Webinar operations support for Chicago teams', 'A calm, practical production rhythm for briefings, labs, and workshops coordinated from Chicago.', 'published', '[{"id":"chicago-il-location-template","type":"location_detail","data":{"locationSlug":"chicago-il"}}]', 'Webinar operations support for Chicago teams', 'A virtual-first webinar operations example for teams working in the Chicago time zone.', FALSE, NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('page-demo-location-austin-tx', 'location-austin-tx', 'Interactive webinar facilitation for Austin teams', 'A flexible lab format for growing teams that need better conversations, decisions, and follow-through.', 'published', '[{"id":"austin-tx-location-template","type":"location_detail","data":{"locationSlug":"austin-tx"}}]', 'Interactive webinar facilitation for Austin teams', 'A virtual-first interactive webinar facilitation example for teams working in the Austin time zone.', FALSE, NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('page-demo-location-denver-co', 'location-denver-co', 'Tabletop workshop production for Denver teams', 'A structured workshop path for teams that want to rehearse response decisions before the pressure is real.', 'published', '[{"id":"denver-co-location-template","type":"location_detail","data":{"locationSlug":"denver-co"}}]', 'Tabletop workshop production for Denver teams', 'A virtual-first tabletop workshop production example for teams working in the Denver time zone.', FALSE, NULL, NULL, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-location-chicago-il', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-location-chicago-il'
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-location-austin-tx', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-location-austin-tx'
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-location-denver-co', id, 1, title, excerpt, status, blocks_json, seo_title, seo_description, NULL, created_at
FROM content_pages WHERE id = 'page-demo-location-denver-co'
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_locations
  (id, page_id, slug, city, region, timezone, accent, eyebrow, title, summary, description, best_for_json, delivery_modes_json, faqs_json, created_at, updated_at)
VALUES
  ('location-demo-chicago-il', 'page-demo-location-chicago-il', 'chicago-il', 'Chicago', 'Illinois', 'Central Time', 'teal', 'Sample coverage · Central Time', 'Webinar operations support for Chicago teams', 'A calm, practical production rhythm for briefings, labs, and workshops coordinated from Chicago.', 'This sample service page shows how Webinar Studio can describe virtual-first facilitation and registration support for teams working in the Chicago time zone. It is a planning example, not a claim of a local storefront or an imported customer relationship.', '["Central-time leadership briefings","Cross-functional operating reviews","Small-group learning labs"]', '["Virtual room setup","Live facilitation support","Post-session replay handoff"]', '[{"question":"Is this an in-person Chicago venue?","answer":"No. This release models virtual-first webinar delivery. A future production deployment can attach a confirmed venue or streaming provider to an individual session."},{"question":"Can the session work across time zones?","answer":"Yes. The webinar record stores UTC time together with its IANA timezone so operators can publish a clear local time and attendees can plan confidently."},{"question":"What can a Chicago team start with?","answer":"Start with a published sample session, choose a tier, and use the registration flow to exercise seat holds, confirmation records, and attendee access."}]', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('location-demo-austin-tx', 'page-demo-location-austin-tx', 'austin-tx', 'Austin', 'Texas', 'Central Time', 'coral', 'Sample coverage · Central Time', 'Interactive webinar facilitation for Austin teams', 'A flexible lab format for growing teams that need better conversations, decisions, and follow-through.', 'This synthetic Austin example focuses on interactive learning: a clear run of show, a focused attendee experience, and an operational record that survives the live room. It intentionally contains no local addresses, customer lists, or inherited product catalog.', '["Manager enablement labs","Distributed team onboarding","Decision-making workshops"]', '["Interactive agenda design","Moderated Q&A flow","Attendance and replay tracking"]', '[{"question":"Can the lab include multiple seat tiers?","answer":"Yes. Each webinar can define its own tiers and capacities. The server keeps inventory authoritative and records the selected tier with each registration."},{"question":"Do attendees need an account?","answer":"No for the demo registration flow. An optional attendee account gives returning participants a place to see their synthetic registrations and replay links."},{"question":"Can operators change the format later?","answer":"The playbook templates are intentionally separate from the webinar record, so an operator can start with a lab template and refine the session without coupling it to a product entry."}]', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('location-demo-denver-co', 'page-demo-location-denver-co', 'denver-co', 'Denver', 'Colorado', 'Mountain Time', 'gold', 'Sample coverage · Mountain Time', 'Tabletop workshop production for Denver teams', 'A structured workshop path for teams that want to rehearse response decisions before the pressure is real.', 'This sample Denver page demonstrates a tabletop-workshop service line for virtual teams. It emphasizes preparation, a repeatable facilitation pattern, and post-event follow-through without inventing reviews, local offices, or customer outcomes.', '["Incident response rehearsals","Risk and resilience workshops","Leadership scenario practice"]', '["Scenario and agenda planning","Facilitator runbook","Action summary and replay plan"]', '[{"question":"What makes a tabletop different from a briefing?","answer":"A tabletop asks participants to make decisions against a shared scenario. The sample catalog keeps that format distinct from a one-way briefing so the operator can choose the right experience."},{"question":"Is the Denver workshop a real scheduled event?","answer":"It is synthetic sample content for the new standalone release. Operators can publish a real session only after adding their own confirmed schedule and provider details."},{"question":"Can the workshop be delivered remotely?","answer":"Yes. The sample delivery mode is virtual-first, with an explicit provider adapter reserved for a future production connection."}]', CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (id) DO NOTHING;
