-- ============================================================
-- Google Calendar Import (Google -> site, per-event review)
-- ============================================================

-- Mark events that originated from a Google import, so the push sync
-- (site -> Google) never re-sends them back and creates a duplicate loop.
ALTER TABLE events
ADD COLUMN IF NOT EXISTS imported_from_connection_id UUID REFERENCES calendar_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_imported_from ON events(imported_from_connection_id);

CREATE TABLE calendar_import_candidates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  summary           TEXT NOT NULL,
  description       TEXT,
  location          TEXT,
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,
  is_all_day        BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_event_id  UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_event_id)
);

CREATE TRIGGER calendar_import_candidates_updated_at BEFORE UPDATE ON calendar_import_candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_calendar_import_candidates_connection ON calendar_import_candidates(connection_id);
CREATE INDEX idx_calendar_import_candidates_status ON calendar_import_candidates(status);

ALTER TABLE calendar_import_candidates ENABLE ROW LEVEL SECURITY;

-- Same scoping as calendar_connections: only the owning person can see the
-- events pulled from their own Google calendar.
CREATE POLICY "calendar_import_candidates_owner_only" ON calendar_import_candidates
FOR ALL USING (
  connection_id IN (
    SELECT id FROM calendar_connections
    WHERE person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  )
) WITH CHECK (
  connection_id IN (
    SELECT id FROM calendar_connections
    WHERE person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  )
);
