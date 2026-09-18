CREATE TABLE IF NOT EXISTS site_templates (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('header', 'footer')),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  blocks_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS site_template_revisions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES site_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  blocks_json TEXT NOT NULL,
  saved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_site_template_revisions_template_version
  ON site_template_revisions(template_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_site_templates_kind_status
  ON site_templates(kind, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_templates_one_active_per_kind
  ON site_templates(kind)
  WHERE is_active = TRUE;

INSERT INTO site_templates
  (id, kind, name, status, is_active, blocks_json, created_at, updated_at, published_at)
VALUES
  (
    'template-default-header',
    'header',
    'Default Header',
    'published',
    TRUE,
    $$[{"id":"default-header-container","type":"container","data":{},"layout":{"mode":"flex","contentWidth":"full","spacing":"global","direction":"row","justifyContent":"space-between","alignItems":"center","wrap":"nowrap","columns":2,"rows":1,"autoFlow":"row","justifyItems":"stretch"},"children":[{"id":"default-header-brand","type":"heading","data":{"text":"Webinar Studio","tag":"h2","link":"/","linkTarget":"same","linkNofollow":"no"}},{"id":"default-header-navigation","type":"navigation_menu","data":{"heading":"Primary navigation","menuId":"navigation-menu-primary","layout":"horizontal"}}]}]$$,
    CURRENT_TIMESTAMP::text,
    CURRENT_TIMESTAMP::text,
    CURRENT_TIMESTAMP::text
  ),
  (
    'template-default-footer',
    'footer',
    'Default Footer',
    'published',
    TRUE,
    $$[{"id":"default-footer-container","type":"container","data":{},"layout":{"mode":"flex","contentWidth":"full","spacing":"global","direction":"column","justifyContent":"start","alignItems":"stretch","wrap":"nowrap","columns":1,"rows":1,"autoFlow":"row","justifyItems":"stretch"},"children":[{"id":"default-footer-copy","type":"rich_text","data":{"heading":"Stay in the loop","body":"Keep the next session, replay, and support path easy to find."}},{"id":"default-footer-navigation","type":"navigation_menu","data":{"heading":"Footer navigation","menuId":"navigation-menu-footer","layout":"horizontal"}}]}]$$,
    CURRENT_TIMESTAMP::text,
    CURRENT_TIMESTAMP::text,
    CURRENT_TIMESTAMP::text
  )
ON CONFLICT (id) DO NOTHING;
