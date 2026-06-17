-- Fix null week_parity for weekly_alternating rules
-- Set default to 'odd' for existing rules without week_parity
UPDATE recurrence_rules
SET week_parity = 'odd'
WHERE pattern_type = 'weekly_alternating'
  AND week_parity IS NULL;
