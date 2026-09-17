ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_payment_status_check
  CHECK (payment_status IN ('free', 'paid', 'pending', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_registrations_webinar_access_payment
  ON registrations(webinar_id, access_status, payment_status);
