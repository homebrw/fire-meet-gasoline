-- ============================================================
-- Rework recurrence_exceptions: present/absent range model
-- ============================================================
-- BREAKING CHANGE: the previous 5-type point-in-time model
-- (cancel/move/extend/shorten/add) cannot be losslessly mapped to the
-- new 2-type range model (present/absent). Existing exception rows are
-- deleted rather than migrated -- recreate them manually after this
-- migration if needed. person_id is dropped because the person is now
-- always implicit via recurrence_rule_id -> recurrence_rules.person_id.

DELETE FROM recurrence_exceptions;

ALTER TABLE recurrence_exceptions
  DROP COLUMN person_id,
  DROP COLUMN original_start_at,
  DROP COLUMN original_end_at,
  DROP COLUMN override_start_at,
  DROP COLUMN override_end_at;

ALTER TABLE recurrence_exceptions
  ADD COLUMN start_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN end_at   TIMESTAMPTZ NOT NULL;

ALTER TABLE recurrence_exceptions
  DROP CONSTRAINT recurrence_exceptions_type_check;

ALTER TABLE recurrence_exceptions
  ADD CONSTRAINT recurrence_exceptions_type_check
  CHECK (type IN ('present', 'absent'));

ALTER TABLE recurrence_exceptions
  ADD CONSTRAINT recurrence_exceptions_end_after_start
  CHECK (end_at > start_at);
