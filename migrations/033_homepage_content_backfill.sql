UPDATE content_pages
SET excerpt = 'The editable landing page for the standalone Webinar Studio workspace.',
    blocks_json = '[{"id":"home-hero","type":"hero","data":{"eyebrow":"Live learning, made practical","heading":"Make the room work for people.","body":"Build thoughtful sessions, give every attendee a clear next step, and keep the work connected after the broadcast.","ctaLabel":"Explore live sessions","ctaHref":"/webinars"}},{"id":"home-form","type":"form","data":{"heading":"Tell us what you need","formSlug":"session-request"}},{"id":"home-products","type":"product_grid","data":{"heading":"Tools for the work around the session","maxItems":3}},{"id":"home-copy","type":"rich_text","data":{"heading":"One calm operating flow","body":"From the first invitation to replay access, Webinar Studio keeps the details visible without turning the experience into a stack of disconnected tools."}},{"id":"home-cta","type":"cta","data":{"heading":"Ready for a better live experience?","body":"Browse the next sessions or open the studio workspace to shape the public experience.","buttonLabel":"View the schedule","buttonHref":"/webinars"}}]',
    seo_title = 'Webinar Studio',
    seo_description = 'Practical live learning experiences with a clear path from invitation to replay.',
    updated_at = CURRENT_TIMESTAMP::text,
    published_at = COALESCE(published_at, CURRENT_TIMESTAMP::text)
WHERE id = 'page-demo-home'
  AND (blocks_json IS NULL OR btrim(blocks_json) IN ('', '[]'));

INSERT INTO content_page_revisions
  (id, page_id, version, title, excerpt, status, blocks_json, seo_title, seo_description, saved_by, created_at)
SELECT 'revision-demo-home-content', p.id,
       COALESCE((SELECT MAX(version) FROM content_page_revisions r WHERE r.page_id = p.id), 0) + 1,
       p.title, p.excerpt, p.status, p.blocks_json, p.seo_title, p.seo_description, NULL, p.updated_at
FROM content_pages p
WHERE p.id = 'page-demo-home'
  AND p.blocks_json IS NOT NULL
  AND btrim(p.blocks_json) <> '[]'
ON CONFLICT (id) DO NOTHING;
