-- ============================================================
-- Fin d'été 2026 : deux périodes ponctuelles avant le rythme scolaire
-- ============================================================
-- Les règles créées par 018 (alternance Damien, cycle Clotilde) démarrent
-- toutes deux le 2026-08-31 : rien ne couvrait encore la fin de l'été.
-- Ajoute deux règles `manual` (une période ponctuelle chacune, sans
-- récurrence — cf. lib/recurrence/README.md) qui se terminent exactement
-- au 2026-08-31 08:30, à l'instant où les règles scolaires prennent le
-- relais : aucun chevauchement, aucun trou côté Clotilde.
--
-- Damien   : dimanche 2026-08-09 12:00 -> lundi 2026-08-31 08:30
-- Clotilde : dimanche 2026-08-16 17:00 -> lundi 2026-08-31 08:30
--
-- Rien ne relie Damien à ses filles entre le 2026-08-31 08:30 et le
-- 2026-09-07 (semaine 36, paire = pas Damien selon la règle 018) : c'est
-- attendu, cette semaine-là revient à l'autre parent, non suivi dans l'app.
--
-- Idempotente : supprime puis recrée ses propres règles par nom, comme 018.

DO $$
DECLARE
  v_damien      UUID;
  v_marie_alix  UUID;
  v_names       TEXT[] := ARRAY[
    'Damien — fin été 2026 (09/08 au 31/08)',
    'Clotilde — fin été 2026 (16/08 au 31/08)'
  ];
  v_old         UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM persons WHERE is_child = false) THEN
    RAISE NOTICE 'Aucun adulte en base : données de garde non insérées (environnement neuf).';
    RETURN;
  END IF;

  SELECT id INTO v_damien
  FROM persons WHERE is_child = false AND name ILIKE 'damien%' LIMIT 1;

  SELECT id INTO v_marie_alix
  FROM persons WHERE is_child = false AND name ILIKE 'marie%alix%' LIMIT 1;

  IF v_damien IS NULL THEN
    RAISE EXCEPTION 'Aucun adulte dont le nom commence par « Damien » dans persons.';
  END IF;
  IF v_marie_alix IS NULL THEN
    RAISE EXCEPTION 'Aucun adulte dont le nom ressemble à « Marie-Alix » dans persons.';
  END IF;

  SELECT array_agg(id) INTO v_old FROM recurrence_rules WHERE name = ANY(v_names);
  IF v_old IS NOT NULL THEN
    DELETE FROM child_presences     WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM custody_transitions WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM recurrence_rules    WHERE id = ANY(v_old); -- cascade sur les exceptions
  END IF;

  INSERT INTO recurrence_rules (
    person_id, name, pattern_type, starts_at, ends_at,
    custody_start_time, custody_end_time, is_active
  ) VALUES (
    v_damien,
    'Damien — fin été 2026 (09/08 au 31/08)',
    'manual',
    TIMESTAMPTZ '2026-08-09 00:00:00+02',
    TIMESTAMPTZ '2026-08-31 00:00:00+02',
    '12:00', '08:30', true
  );

  INSERT INTO recurrence_rules (
    person_id, name, pattern_type, starts_at, ends_at,
    custody_start_time, custody_end_time, is_active
  ) VALUES (
    v_marie_alix,
    'Clotilde — fin été 2026 (16/08 au 31/08)',
    'manual',
    TIMESTAMPTZ '2026-08-16 00:00:00+02',
    TIMESTAMPTZ '2026-08-31 00:00:00+02',
    '17:00', '08:30', true
  );
END $$;
