-- ============================================================
-- Add missing event columns
-- ============================================================

-- Add is_all_day if it doesn't exist
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT false;

-- Add allow_participants_to_see_attachments if it doesn't exist
ALTER TABLE events
ADD COLUMN IF NOT EXISTS allow_participants_to_see_attachments BOOLEAN NOT NULL DEFAULT true;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_events_all_day ON events(is_all_day);
