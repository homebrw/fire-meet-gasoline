ALTER TABLE child_presences
  ADD COLUMN exception_id UUID REFERENCES recurrence_exceptions(id) ON DELETE SET NULL;

ALTER TABLE custody_transitions
  ADD COLUMN exception_id UUID REFERENCES recurrence_exceptions(id) ON DELETE SET NULL;
