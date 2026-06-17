-- ============================================================
-- Add all-day event support
-- ============================================================

ALTER TABLE events
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_events_all_day ON events(is_all_day);
