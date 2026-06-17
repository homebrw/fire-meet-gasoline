-- ============================================================
-- Participants & Children Support
-- ============================================================

-- Add child-related columns to persons table (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'persons' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE persons ADD COLUMN date_of_birth DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'persons' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE persons ADD COLUMN parent_id UUID REFERENCES persons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'persons' AND column_name = 'is_child'
  ) THEN
    ALTER TABLE persons ADD COLUMN is_child BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create event_participants table (many-to-many between events and persons)
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, person_id)
);

-- Create index for fast lookups by event (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'event_participants' AND index_name = 'idx_participants_event'
  ) THEN
    CREATE INDEX idx_participants_event ON event_participants(event_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'event_participants' AND index_name = 'idx_participants_person'
  ) THEN
    CREATE INDEX idx_participants_person ON event_participants(person_id);
  END IF;
END $$;

-- Add trigger for updated_at on event_participants
DROP TRIGGER IF EXISTS event_participants_updated_at ON event_participants;
CREATE TRIGGER event_participants_updated_at
BEFORE UPDATE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Add column to events table to control attachment visibility (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'allow_participants_to_see_attachments'
  ) THEN
    ALTER TABLE events ADD COLUMN allow_participants_to_see_attachments BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- RLS POLICIES for event_participants
-- ============================================================

-- Helper function to check if user can manage event participants
-- Uses SECURITY DEFINER to bypass nested RLS issues when checking events table
CREATE OR REPLACE FUNCTION can_manage_event_participants(event_id UUID) RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND (
        visibility = 'both'
        OR owner_person_id IN (
          SELECT id FROM persons WHERE auth_user_id = auth.uid()
        )
      )
    )
  $$;

-- Enable RLS on event_participants if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'event_participants' AND rowsecurity = true
  ) THEN
    ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- All app members can view event participants
DROP POLICY IF EXISTS "event_participants_select" ON event_participants;
CREATE POLICY "event_participants_select" ON event_participants
FOR SELECT USING (is_app_member());

-- Only event owner can insert/update/delete participants, or any member can for shared events
DROP POLICY IF EXISTS "event_participants_insert" ON event_participants;
CREATE POLICY "event_participants_insert" ON event_participants
FOR INSERT WITH CHECK (
  is_app_member() AND can_manage_event_participants(event_id)
);

DROP POLICY IF EXISTS "event_participants_update" ON event_participants;
CREATE POLICY "event_participants_update" ON event_participants
FOR UPDATE USING (
  is_app_member() AND can_manage_event_participants(event_id)
);

DROP POLICY IF EXISTS "event_participants_delete" ON event_participants;
CREATE POLICY "event_participants_delete" ON event_participants
FOR DELETE USING (
  is_app_member() AND can_manage_event_participants(event_id)
);

-- ============================================================
-- Helper functions for event_attachments RLS
-- ============================================================

-- Check if user is event owner
CREATE OR REPLACE FUNCTION is_event_owner(event_id UUID) RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND owner_person_id IN (
        SELECT id FROM persons WHERE auth_user_id = auth.uid()
      )
    )
  $$;

-- Check if user is event participant
CREATE OR REPLACE FUNCTION is_event_participant(event_id UUID) RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = event_id
      AND person_id IN (
        SELECT persons.id FROM persons
        WHERE persons.auth_user_id = auth.uid()
        OR persons.parent_id IN (
          SELECT id FROM persons WHERE persons.auth_user_id = auth.uid()
        )
      )
    )
  $$;

-- Check if attachments are visible to participants
CREATE OR REPLACE FUNCTION can_see_event_attachments(event_id UUID) RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id
      AND allow_participants_to_see_attachments = true
    )
  $$;

-- ============================================================
-- Update event_attachments RLS to allow participants to see
-- ============================================================

-- Drop old policy and create new one that includes participants
DROP POLICY IF EXISTS "event_attachments_select" ON event_attachments;
DROP POLICY IF EXISTS "members_all" ON event_attachments;

CREATE POLICY "event_attachments_select" ON event_attachments
FOR SELECT USING (
  is_app_member() AND (
    is_event_owner(event_id)
    OR
    (can_see_event_attachments(event_id) AND is_event_participant(event_id))
  )
);

-- Update event_attachments insert policy to allow participants
DROP POLICY IF EXISTS "event_attachments_insert" ON event_attachments;

CREATE POLICY "event_attachments_insert" ON event_attachments
FOR INSERT WITH CHECK (
  is_app_member() AND (
    is_event_owner(event_id)
    OR is_event_participant(event_id)
  )
);
