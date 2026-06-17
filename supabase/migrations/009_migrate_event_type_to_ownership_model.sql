-- ============================================================
-- Migrate from event type field to ownership-based model
-- ============================================================

-- Steps 1-4 only apply if the legacy "type" column still exists
-- (migration 008 already dropped it on databases that ran it first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'type'
  ) THEN
    -- Step 1: If type column exists and is NOT NULL, make it nullable first
    -- This allows us to safely migrate existing events
    ALTER TABLE events ALTER COLUMN type DROP NOT NULL;

    -- Step 2: Migrate existing 'individual' type events to use owner_person_id
    -- Events with type='individual' should have owner_person_id set to created_by
    -- (assuming the creator is the owner for existing individual events)
    -- Only do this if owner_person_id is NULL (to avoid overwriting existing values)
    UPDATE events
    SET owner_person_id = created_by
    WHERE type = 'individual' AND owner_person_id IS NULL;

    -- Step 3: Events with type='shared' should have owner_person_id = NULL (already the default)
    -- No action needed for these

    -- Step 4: Drop the type column once migration is complete
    ALTER TABLE events DROP COLUMN type;
  END IF;
END $$;

-- Step 5: Ensure default values are correct for new events
-- These should already be correct, but let's be explicit
ALTER TABLE events
ALTER COLUMN visibility SET DEFAULT 'both',
ALTER COLUMN is_blocking SET DEFAULT false,
ALTER COLUMN is_all_day SET DEFAULT false,
ALTER COLUMN allow_participants_to_see_attachments SET DEFAULT true;
