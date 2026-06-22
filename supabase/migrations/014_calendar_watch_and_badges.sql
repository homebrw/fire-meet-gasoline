-- ============================================================
-- Google Calendar push notifications (webhook channel bookkeeping)
-- ============================================================

ALTER TABLE calendar_connections
ADD COLUMN IF NOT EXISTS google_channel_id TEXT,
ADD COLUMN IF NOT EXISTS google_resource_id TEXT,
ADD COLUMN IF NOT EXISTS google_channel_token TEXT,
ADD COLUMN IF NOT EXISTS channel_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendar_connections_channel ON calendar_connections(google_channel_id);
