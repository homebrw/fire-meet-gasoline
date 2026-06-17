-- ============================================================
-- Repair event_participants RLS (idempotent)
-- Re-asserts the function/policies from 003_add_participants_and_children.sql
-- in case earlier migrations were only partially applied to this database.
-- ============================================================

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

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_participants_select" ON event_participants;
CREATE POLICY "event_participants_select" ON event_participants
FOR SELECT USING (is_app_member());

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
