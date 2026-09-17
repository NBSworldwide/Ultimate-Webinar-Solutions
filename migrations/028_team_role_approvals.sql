CREATE TABLE IF NOT EXISTS team_role_change_requests (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('manager')),
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  review_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_role_requests_pending_target
  ON team_role_change_requests(target_user_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_team_role_requests_status_created
  ON team_role_change_requests(status, created_at);

INSERT INTO email_templates
  (id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, created_at, updated_at)
VALUES
  ('email-template-manager-promotion-request', 'manager-promotion-request', 'Manager promotion approval request', 'team.role_promotion_requested', 'transactional',
   'Manager approval needed for {{target_name}}', 'A Customer is awaiting Administrator of Record review.',
   '<h1>Manager approval requested</h1><p>{{requester_name}} submitted <strong>{{target_name}}</strong> ({{target_username}}) for Manager approval.</p><p>Customer email: {{target_email}}</p><p>Review the request in Team &amp; Access: <a href="{{approval_link}}">Open Team &amp; Access</a></p>',
   'Manager approval requested\n\n{{requester_name}} submitted {{target_name}} ({{target_username}}) for Manager approval.\nCustomer email: {{target_email}}\nReview the request in Team & Access: {{approval_link}}', 'active', NOW()::text, NOW()::text),
  ('email-template-manager-promotion-approved', 'manager-promotion-approved', 'Manager promotion approved', 'team.role_promotion_reviewed', 'transactional',
   'Manager promotion approved for {{target_name}}', 'The Administrator of Record approved this role request.',
   '<h1>Manager promotion approved</h1><p>The request for <strong>{{target_name}}</strong> ({{target_username}}) was approved by {{reviewer_name}}.</p><p>The account now has Manager access.</p><p>Review Team &amp; Access: <a href="{{team_link}}">Open Team &amp; Access</a></p><p>Review note: {{review_note}}</p>',
   'Manager promotion approved\n\nThe request for {{target_name}} ({{target_username}}) was approved by {{reviewer_name}}.\nThe account now has Manager access.\nReview Team & Access: {{team_link}}\nReview note: {{review_note}}', 'active', NOW()::text, NOW()::text),
  ('email-template-manager-promotion-denied', 'manager-promotion-denied', 'Manager promotion denied', 'team.role_promotion_reviewed', 'transactional',
   'Manager promotion request for {{target_name}} was denied', 'The Administrator of Record declined this role request.',
   '<h1>Manager promotion request denied</h1><p>The request for <strong>{{target_name}}</strong> ({{target_username}}) was denied by {{reviewer_name}}.</p><p>The account remains a Customer account.</p><p>Review note: {{review_note}}</p><p>Review Team &amp; Access: <a href="{{team_link}}">Open Team &amp; Access</a></p>',
   'Manager promotion request denied\n\nThe request for {{target_name}} ({{target_username}}) was denied by {{reviewer_name}}.\nThe account remains a Customer account.\nReview note: {{review_note}}\nReview Team & Access: {{team_link}}', 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
