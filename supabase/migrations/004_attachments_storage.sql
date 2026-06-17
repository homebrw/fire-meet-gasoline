-- ============================================================
-- Attachments Storage & Simplified RLS
-- ============================================================

-- Create storage bucket if it doesn't exist
-- (Must be run manually in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('attachments', 'attachments', false);

-- ============================================================
-- Simplify event_attachments RLS policies
-- Follows event visibility: if you can see event, you can see attachments
-- ============================================================

-- Drop existing complex policies
DROP POLICY IF EXISTS "event_attachments_select" ON event_attachments;
DROP POLICY IF EXISTS "event_attachments_insert" ON event_attachments;
DROP POLICY IF EXISTS "members_all" ON event_attachments;

-- SELECT: Can see attachments if can see the event
CREATE POLICY "event_attachments_select" ON event_attachments
FOR SELECT USING (
  is_app_member() AND (
    -- Owner can see all their event attachments
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_attachments.event_id
      AND events.owner_person_id IN (
        SELECT id FROM persons WHERE auth_user_id = auth.uid()
      )
    )
    OR
    -- Anyone can see attachments if event visibility='both'
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_attachments.event_id
      AND events.visibility = 'both'
    )
    OR
    -- Participants can see attachments if they can see the event
    (
      EXISTS (
        SELECT 1 FROM event_participants
        WHERE event_participants.event_id = event_attachments.event_id
        AND event_participants.person_id IN (
          SELECT id FROM persons WHERE auth_user_id = auth.uid()
        )
      )
      AND
      EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_attachments.event_id
        AND (
          events.visibility = 'both'
          OR events.owner_person_id IN (
            SELECT id FROM persons WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- INSERT: Can upload if owner or participant
CREATE POLICY "event_attachments_insert" ON event_attachments
FOR INSERT WITH CHECK (
  is_app_member() AND (
    -- Owner can upload
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_attachments.event_id
      AND events.owner_person_id IN (
        SELECT id FROM persons WHERE auth_user_id = auth.uid()
      )
    )
    OR
    -- Participant can upload if event is visible to them
    (
      EXISTS (
        SELECT 1 FROM event_participants
        WHERE event_participants.event_id = event_attachments.event_id
        AND event_participants.person_id IN (
          SELECT id FROM persons WHERE auth_user_id = auth.uid()
        )
      )
      AND
      EXISTS (
        SELECT 1 FROM events
        WHERE events.id = event_attachments.event_id
        AND (
          events.visibility = 'both'
          OR events.owner_person_id IN (
            SELECT id FROM persons WHERE auth_user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- DELETE: Only owner can delete attachments
CREATE POLICY "event_attachments_delete" ON event_attachments
FOR DELETE USING (
  is_app_member() AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_attachments.event_id
    AND events.owner_person_id IN (
      SELECT id FROM persons WHERE auth_user_id = auth.uid()
    )
  )
);

-- ============================================================
-- Storage Policies (for bucket-level access control)
-- Applied to 'attachments' bucket
-- ============================================================

-- Storage policy for SELECT (download)
-- Run in Supabase dashboard under Storage > attachments > Policies
/*
CREATE POLICY "authenticated_can_download_events"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
  AND (
    -- Extract event_id from path: events/{event_id}/...
    CASE
      WHEN name LIKE 'events/%' THEN
        EXISTS (
          SELECT 1 FROM event_attachments ea
          WHERE ea.storage_path = storage.objects.name
          AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = ea.event_id
            AND (
              e.visibility = 'both'
              OR e.owner_person_id IN (
                SELECT id FROM persons WHERE auth_user_id = auth.uid()
              )
              OR EXISTS (
                SELECT 1 FROM event_participants ep
                WHERE ep.event_id = e.id
                AND ep.person_id IN (
                  SELECT id FROM persons WHERE auth_user_id = auth.uid()
                )
              )
            )
          )
        )
      ELSE FALSE
    END
  )
);

CREATE POLICY "authenticated_can_upload_events"
ON storage.objects
FOR INSERT
USING (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
  AND name LIKE 'events/%'
)
WITH CHECK (
  bucket_id = 'attachments'
  AND name LIKE 'events/%'
);

CREATE POLICY "owner_can_delete_events"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
  AND name LIKE 'events/%'
  AND EXISTS (
    SELECT 1 FROM event_attachments ea
    WHERE ea.storage_path = storage.objects.name
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = ea.event_id
      AND e.owner_person_id IN (
        SELECT id FROM persons WHERE auth_user_id = auth.uid()
      )
    )
  )
);
*/
