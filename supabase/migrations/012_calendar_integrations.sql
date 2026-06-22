-- ============================================================
-- Google Calendar Integration (one-way sync: site -> Google)
-- ============================================================

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'google'),
  google_account_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, provider)
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Token storage is sensitive: scope strictly to the owning person,
-- unlike the shared `is_app_member()` policy used elsewhere, so the
-- other co-parent can never read/refresh/revoke this connection.
CREATE POLICY "calendar_connections_owner_only" ON calendar_connections
FOR ALL USING (
  person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
) WITH CHECK (
  person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
);

CREATE TABLE calendar_sync_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL CHECK (source_table IN ('child_presences', 'custody_transitions', 'events')),
  source_id UUID NOT NULL,
  external_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, source_table, source_id)
);

ALTER TABLE calendar_sync_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON calendar_sync_links FOR ALL USING (is_app_member());

CREATE INDEX calendar_sync_links_connection_idx ON calendar_sync_links(connection_id);
