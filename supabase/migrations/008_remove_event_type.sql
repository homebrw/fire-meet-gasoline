-- Remove event type field and rely solely on owner_person_id and event_participants
ALTER TABLE events DROP COLUMN IF EXISTS type;
