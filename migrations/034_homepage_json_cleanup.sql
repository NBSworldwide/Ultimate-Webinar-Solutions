UPDATE content_pages
SET blocks_json = left(btrim(blocks_json), length(btrim(blocks_json)) - 1),
    updated_at = CURRENT_TIMESTAMP::text
WHERE id = 'page-demo-home'
  AND right(btrim(blocks_json), 2) = ']}';

UPDATE content_page_revisions
SET blocks_json = left(btrim(blocks_json), length(btrim(blocks_json)) - 1)
WHERE id = 'revision-demo-home-content'
  AND right(btrim(blocks_json), 2) = ']}';
