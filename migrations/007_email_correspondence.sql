CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('transactional', 'marketing')),
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_sequences (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  template_id TEXT NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  trigger_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  template_id TEXT REFERENCES email_templates(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  last_error TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_status_trigger
  ON email_templates(status, trigger_key);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status_trigger
  ON email_sequences(status, trigger_key);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_schedule
  ON email_outbox(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient
  ON email_outbox(recipient_email, created_at);

INSERT INTO email_templates
  (id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, created_at, updated_at)
VALUES
  ('email-template-registration-confirmed', 'registration-confirmed', 'Registration confirmation', 'registration.created', 'transactional',
   'You are registered for {{session_title}}', 'Your seat and session details are ready.',
   '<h1>You are registered</h1><p>Hi {{customer_name}}, your seat for <strong>{{session_title}}</strong> is confirmed.</p><p>Session time: {{session_start_time}}</p><p><a href="{{session_access_link}}">Open session details</a></p>',
   'You are registered\n\nHi {{customer_name}}, your seat for {{session_title}} is confirmed.\nSession time: {{session_start_time}}\nOpen session details: {{session_access_link}}', 'active', NOW()::text, NOW()::text),
  ('email-template-private-invite', 'private-invite', 'Private session invitation', 'session.invite.created', 'transactional',
   'You are invited to {{session_title}}', 'Your private access details are inside.',
   '<h1>You are invited</h1><p>Hi {{customer_name}}, you have been invited to <strong>{{session_title}}</strong>.</p><p>Use your private access link to continue: <a href="{{session_access_link}}">Open invitation</a></p>',
   'You are invited\n\nHi {{customer_name}}, you have been invited to {{session_title}}.\nOpen invitation: {{session_access_link}}', 'active', NOW()::text, NOW()::text),
  ('email-template-session-reminder', 'session-reminder', 'Session reminder', 'session.reminder.scheduled', 'transactional',
   '{{session_title}} starts soon', 'A quick reminder with your access link.',
   '<h1>Your session starts soon</h1><p>Hi {{customer_name}}, {{session_title}} begins at {{session_start_time}}.</p><p><a href="{{session_access_link}}">Open session access</a></p>',
   'Your session starts soon\n\nHi {{customer_name}}, {{session_title}} begins at {{session_start_time}}.\nOpen session access: {{session_access_link}}', 'active', NOW()::text, NOW()::text),
  ('email-template-replay-available', 'replay-available', 'Replay available', 'replay.published', 'transactional',
   'The replay for {{session_title}} is ready', 'Your registered replay is now available.',
   '<h1>Your replay is ready</h1><p>Hi {{customer_name}}, the replay for <strong>{{session_title}}</strong> is now available.</p><p><a href="{{replay_link}}">Watch the replay</a></p>',
   'Your replay is ready\n\nHi {{customer_name}}, the replay for {{session_title}} is now available.\nWatch the replay: {{replay_link}}', 'active', NOW()::text, NOW()::text),
  ('email-template-order-confirmed', 'order-confirmed', 'Order confirmation', 'order.created', 'transactional',
   'Order {{order_number}} is confirmed', 'Your order has been received and is ready for fulfillment.',
   '<h1>Order confirmed</h1><p>Hi {{customer_name}}, order <strong>{{order_number}}</strong> has been received.</p><p>Total: {{order_total}}</p><p>We will send another message when it ships.</p>',
   'Order confirmed\n\nHi {{customer_name}}, order {{order_number}} has been received.\nTotal: {{order_total}}\nWe will send another message when it ships.', 'active', NOW()::text, NOW()::text),
  ('email-template-shipment-confirmed', 'shipment-confirmed', 'Shipment confirmation', 'order.shipped', 'transactional',
   'Order {{order_number}} is on the way', 'Your shipment tracking details are ready.',
   '<h1>Your order is on the way</h1><p>Hi {{customer_name}}, order <strong>{{order_number}}</strong> has shipped.</p><p>Carrier: {{tracking_carrier}}<br />Tracking: {{tracking_number}}</p>',
   'Your order is on the way\n\nHi {{customer_name}}, order {{order_number}} has shipped.\nCarrier: {{tracking_carrier}}\nTracking: {{tracking_number}}', 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO email_sequences (id, slug, name, trigger_key, status, created_at, updated_at)
VALUES
  ('email-sequence-attendee-journey', 'attendee-journey', 'Attendee session journey', 'registration.created', 'active', NOW()::text, NOW()::text),
  ('email-sequence-order-journey', 'order-journey', 'Product order journey', 'order.created', 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO email_sequence_steps (id, sequence_id, step_order, delay_minutes, template_id)
VALUES
  ('email-step-attendee-confirmation', 'email-sequence-attendee-journey', 1, 0, 'email-template-registration-confirmed'),
  ('email-step-attendee-reminder', 'email-sequence-attendee-journey', 2, 1440, 'email-template-session-reminder'),
  ('email-step-order-confirmation', 'email-sequence-order-journey', 1, 0, 'email-template-order-confirmed'),
  ('email-step-order-shipment', 'email-sequence-order-journey', 2, 0, 'email-template-shipment-confirmed')
ON CONFLICT (id) DO NOTHING;
