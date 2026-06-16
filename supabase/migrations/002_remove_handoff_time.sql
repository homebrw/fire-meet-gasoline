-- Drop redundant handoff_time column
-- The handoff should occur at either custody_start_time or custody_end_time
ALTER TABLE recurrence_rules DROP COLUMN handoff_time;
