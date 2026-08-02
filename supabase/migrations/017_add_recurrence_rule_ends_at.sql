-- ============================================================
-- recurrence_rules.ends_at — fin de validité d'une règle
-- ============================================================
-- Colonne manquante dans les migrations. L'application la référence pourtant
-- partout depuis longtemps :
--   - lib/types/index.ts        -> RecurrenceRule.ends_at
--   - lib/actions/recurrence.ts -> ruleSchema, écrite à chaque création
--   - components/forms/RecurrenceRuleForm.tsx -> champ « Fin de validité »
--   - lib/recurrence/engine.ts  -> borne haute de l'expansion des périodes
-- mais aucune migration ne l'a jamais créée : elle a été ajoutée à la main
-- en production. Cette migration remet le dépôt en accord avec la base.
--
-- Idempotente : sans effet si la colonne existe déjà.

ALTER TABLE recurrence_rules
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

COMMENT ON COLUMN recurrence_rules.ends_at IS
  'Fin de validité de la règle (incluse). NULL = règle sans date de fin.';
