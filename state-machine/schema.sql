-- Idempotency lock table used by workflows/vapi-missed-call-recovery.json
-- Run once in your Postgres / Supabase database.

CREATE TABLE IF NOT EXISTS webhook_locks (
  idempotency_key TEXT PRIMARY KEY,
  channel         TEXT NOT NULL CHECK (channel IN ('vapi_voice', 'twilio_sms', 'whatsapp_cloud')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: keep the table small. Run on a schedule (n8n cron, pg_cron, etc.).
-- DELETE FROM webhook_locks WHERE created_at < NOW() - INTERVAL '7 days';
