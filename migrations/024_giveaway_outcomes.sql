ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS giveaway_outcome TEXT CHECK (giveaway_outcome IN ('winner', 'not_winner')),
  ADD COLUMN IF NOT EXISTS giveaway_result_at TEXT,
  ADD COLUMN IF NOT EXISTS giveaway_prize_name TEXT,
  ADD COLUMN IF NOT EXISTS giveaway_prize_sku TEXT,
  ADD COLUMN IF NOT EXISTS giveaway_prize_value_cents INTEGER CHECK (giveaway_prize_value_cents IS NULL OR giveaway_prize_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS giveaway_claim_deadline TEXT,
  ADD COLUMN IF NOT EXISTS giveaway_fulfillment_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE winner_draws
  ALTER COLUMN drawn_by DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'stream_ended'));

CREATE INDEX IF NOT EXISTS idx_registrations_giveaway_outcome
  ON registrations(webinar_id, giveaway_outcome, giveaway_result_at);

INSERT INTO email_templates
  (id, slug, name, trigger_key, message_type, subject, preheader, html_body, text_body, status, created_at, updated_at)
VALUES
  ('email-template-giveaway-winner', 'giveaway-winner', 'Giveaway winner', 'winner.drawn', 'transactional',
   'You won {{prize_name}} in {{session_title}}', 'Your prize and claim instructions are ready.',
   '<h1>Congratulations, {{winner_name}}!</h1><p>You won <strong>{{prize_name}}</strong> in <strong>{{session_title}}</strong>.</p><p>Claim deadline: {{claim_deadline}}</p><p>Next steps: {{fulfillment_notes}}</p><p><a href="{{winner_link}}">Open your account</a> or contact {{site_email}} if you need help.</p>',
   'Congratulations, {{winner_name}}!\n\nYou won {{prize_name}} in {{session_title}}.\nClaim deadline: {{claim_deadline}}\nNext steps: {{fulfillment_notes}}\nOpen your account: {{winner_link}}\nQuestions: {{site_email}}', 'active', NOW()::text, NOW()::text),
  ('email-template-giveaway-not-winner', 'giveaway-not-winner', 'Giveaway result — not selected', 'winner.drawn', 'transactional',
   'Drawing results for {{session_title}}', 'Thank you for joining the session.',
   '<h1>Thank you for joining</h1><p>Hi {{customer_name}}, the drawing for <strong>{{session_title}}</strong> is complete. Your seat was not selected for the prize in this drawing.</p><p>Thank you for taking part, and we hope to see you at another session.</p>',
   'Thank you for joining\n\nHi {{customer_name}}, the drawing for {{session_title}} is complete. Your seat was not selected for the prize in this drawing.\n\nThank you for taking part, and we hope to see you at another session.', 'active', NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
