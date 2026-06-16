-- ============================================================
-- Family Sync — Initial Schema
-- ============================================================

-- Helper: set updated_at on row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE persons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#3b82f6',
  avatar_url   TEXT,
  auth_user_id UUID REFERENCES auth.users(id) UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recurrence_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  pattern_type        TEXT NOT NULL CHECK (pattern_type IN ('weekly_alternating','custom_cycle','manual')),
  starts_at           TIMESTAMPTZ NOT NULL,
  custody_start_time  TEXT NOT NULL DEFAULT '18:00',
  custody_end_time    TEXT NOT NULL DEFAULT '18:00',
  week_parity         TEXT CHECK (week_parity IN ('even','odd')),
  cycle_length_days   INTEGER,
  custody_days        INTEGER[],
  handoff_day         INTEGER,
  handoff_time        TEXT,
  handoff_location    TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recurrence_exceptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_rule_id  UUID NOT NULL REFERENCES recurrence_rules(id) ON DELETE CASCADE,
  person_id           UUID NOT NULL REFERENCES persons(id),
  original_start_at   TIMESTAMPTZ,
  original_end_at     TIMESTAMPTZ,
  override_start_at   TIMESTAMPTZ,
  override_end_at     TIMESTAMPTZ,
  type                TEXT NOT NULL CHECK (type IN ('cancel','move','extend','shorten','add')),
  reason              TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE child_presences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES persons(id),
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  recurrence_rule_id  UUID REFERENCES recurrence_rules(id),
  is_exception        BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE custody_transitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES persons(id),
  transition_at       TIMESTAMPTZ NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('pickup','dropoff')),
  location            TEXT,
  recurrence_rule_id  UUID REFERENCES recurrence_rules(id),
  is_exception        BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  location        TEXT,
  type            TEXT NOT NULL CHECK (type IN ('shared','individual')),
  owner_person_id UUID REFERENCES persons(id),
  created_by      UUID NOT NULL REFERENCES persons(id),
  is_blocking     BOOLEAN NOT NULL DEFAULT false,
  visibility      TEXT NOT NULL DEFAULT 'both' CHECK (visibility IN ('both','private')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type    TEXT,
  file_size    BIGINT,
  uploaded_by  UUID NOT NULL REFERENCES persons(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER persons_updated_at BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rules_updated_at BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER exceptions_updated_at BEFORE UPDATE ON recurrence_exceptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER presences_updated_at BEFORE UPDATE ON child_presences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER transitions_updated_at BEFORE UPDATE ON custody_transitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_rules_person ON recurrence_rules(person_id);
CREATE INDEX idx_exceptions_rule ON recurrence_exceptions(recurrence_rule_id);
CREATE INDEX idx_presences_person ON child_presences(person_id);
CREATE INDEX idx_presences_dates ON child_presences(start_at, end_at);
CREATE INDEX idx_transitions_person ON custody_transitions(person_id);
CREATE INDEX idx_transitions_at ON custody_transitions(transition_at);
CREATE INDEX idx_events_dates ON events(start_at, end_at);
CREATE INDEX idx_events_owner ON events(owner_person_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

CREATE OR REPLACE FUNCTION is_app_member() RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT auth.uid() IS NOT NULL
  $$;

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON persons FOR ALL USING (is_app_member());
CREATE POLICY "members_all" ON recurrence_rules FOR ALL USING (is_app_member());
CREATE POLICY "members_all" ON recurrence_exceptions FOR ALL USING (is_app_member());
CREATE POLICY "members_all" ON child_presences FOR ALL USING (is_app_member());
CREATE POLICY "members_all" ON custody_transitions FOR ALL USING (is_app_member());
CREATE POLICY "members_all" ON event_attachments FOR ALL USING (is_app_member());

-- Events: private events only visible to their owner
CREATE POLICY "events_select" ON events FOR SELECT USING (
  is_app_member() AND (
    visibility = 'both'
    OR owner_person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  )
);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (is_app_member());
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  is_app_member() AND (
    visibility = 'both'
    OR owner_person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  )
);
CREATE POLICY "events_delete" ON events FOR DELETE USING (
  is_app_member() AND (
    visibility = 'both'
    OR owner_person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  )
);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run separately in Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- ============================================================
-- SEED
-- ============================================================

INSERT INTO persons (name, color) VALUES
  ('Damien', '#3b82f6'),
  ('MA', '#ec4899');

-- After creating auth users, link them:
-- UPDATE persons SET auth_user_id = '<damien-auth-uuid>' WHERE name = 'Damien';
-- UPDATE persons SET auth_user_id = '<ma-auth-uuid>' WHERE name = 'MA';
