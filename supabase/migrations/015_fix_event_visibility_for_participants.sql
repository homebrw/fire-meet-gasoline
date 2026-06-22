-- ============================================================
-- Fix event visibility to include participants
-- ============================================================

-- Drop the old events_select policy
DROP POLICY IF EXISTS "events_select" ON events;

-- Create new policy that includes participants
-- Event is visible if:
-- 1. It's shared (visibility = 'both'), OR
-- 2. User is the owner, OR
-- 3. User is a participant in the event
CREATE POLICY "events_select" ON events FOR SELECT USING (
  is_app_member() AND (
    visibility = 'both'
    OR owner_person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
    OR id IN (
      SELECT event_id FROM event_participants
      WHERE person_id IN (
        SELECT id FROM persons WHERE auth_user_id = auth.uid()
      )
    )
  )
);
