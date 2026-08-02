-- ============================================================
-- Alternances Damien (Juliette & Camille) et Marie-Alix (Clotilde)
-- Année scolaire 2026-2027 — zone C
-- ============================================================
-- Script de DONNÉES, pas de schéma. Rejouable : il supprime d'abord les
-- règles qu'il crée (par nom), ainsi que les gardes/passations générées
-- qui les référencent, avant de les réinsérer.
--
-- Convention horaire : tous les instants sont écrits avec leur décalage
-- explicite — +02:00 = heure d'été (CEST), +01:00 = heure d'hiver (CET) —
-- pour ne dépendre ni du fuseau du serveur ni de la configuration de la base.
--
-- Hypothèse à valider : l'heure de passation du matin est fixée à 08:30
-- (source : « à l'heure théorique de début des cours », heure non chiffrée).
-- Pour la corriger, remplacer les '08:30' de ce fichier et rejouer.
--
-- Les périodes affichées dans l'app sont recalculées à la volée depuis ces
-- règles. Les tables child_presences / custody_transitions (cartes
-- « prochaine passation ») sont matérialisées par l'app : après ce script,
-- ouvrir Réglages > Règles et enregistrer chaque règle une fois.

BEGIN;

DO $$
DECLARE
  v_damien      UUID;
  v_marie_alix  UUID;
  v_rule_damien UUID;
  v_rule_ma_1   UUID;
  v_rule_ma_2   UUID;
  v_names       TEXT[] := ARRAY[
    'Garde alternée — semaines ISO impaires',
    'Clotilde — cycle 14 j (jusqu''au 03/01/2027)',
    'Clotilde — cycle 14 j (à partir du 04/01/2027)'
  ];
  v_old         UUID[];
BEGIN
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

  -- ── Nettoyage (rejouabilité) ────────────────────────────────────────────
  -- child_presences et custody_transitions référencent recurrence_rules sans
  -- ON DELETE CASCADE : il faut les retirer avant de supprimer les règles.
  SELECT array_agg(id) INTO v_old FROM recurrence_rules WHERE name = ANY(v_names);
  IF v_old IS NOT NULL THEN
    DELETE FROM child_presences     WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM custody_transitions WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM recurrence_rules    WHERE id = ANY(v_old); -- cascade sur les exceptions
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- 1. DAMIEN — une semaine sur deux, semaines ISO impaires
  --    Passation le lundi matin. Ancrage vérifié : lundi 2026-09-07 = S37
  --    (impaire) = Damien, conforme aux 28 jours de référence.
  -- ════════════════════════════════════════════════════════════════════════
  INSERT INTO recurrence_rules (
    person_id, name, pattern_type, starts_at,
    custody_start_time, custody_end_time,
    week_parity, handoff_day, handoff_location, is_active
  ) VALUES (
    v_damien,
    'Garde alternée — semaines ISO impaires',
    'weekly_alternating',
    TIMESTAMPTZ '2026-09-07 00:00:00+02',
    '08:30', '08:30',
    'odd', 0, 'École', true
  ) RETURNING id INTO v_rule_damien;

  INSERT INTO recurrence_exceptions (recurrence_rule_id, start_at, end_at, type, reason) VALUES
    -- Petites vacances : la passation du milieu passe au samedi 14:00.
    (v_rule_damien, TIMESTAMPTZ '2026-10-24 14:00:00+02', TIMESTAMPTZ '2026-10-26 08:30:00+01', 'absent',  'Toussaint — sortie le samedi 14h'),
    (v_rule_damien, TIMESTAMPTZ '2026-12-26 14:00:00+01', TIMESTAMPTZ '2026-12-28 08:30:00+01', 'present', 'Noël — entrée le samedi 14h'),
    (v_rule_damien, TIMESTAMPTZ '2027-02-13 14:00:00+01', TIMESTAMPTZ '2027-02-15 08:30:00+01', 'present', 'Hiver — entrée le samedi 14h'),
    (v_rule_damien, TIMESTAMPTZ '2027-04-10 14:00:00+02', TIMESTAMPTZ '2027-04-12 08:30:00+02', 'present', 'Printemps — entrée le samedi 14h'),
    -- Lundis fériés : la bascule est reportée au mardi.
    (v_rule_damien, TIMESTAMPTZ '2027-03-29 08:30:00+02', TIMESTAMPTZ '2027-03-30 08:30:00+02', 'absent',  'Lundi de Pâques — reste au parent du week-end'),
    (v_rule_damien, TIMESTAMPTZ '2027-05-17 08:30:00+02', TIMESTAMPTZ '2027-05-18 08:30:00+02', 'present', 'Lundi de Pentecôte — reste au parent du week-end'),
    -- Été 2027 : régime « 8 semaines », passation le dimanche.
    -- L'alternance hebdomadaire est neutralisée, puis les blocs sont posés.
    (v_rule_damien, TIMESTAMPTZ '2027-07-04 00:00:00+02', TIMESTAMPTZ '2027-08-30 08:30:00+02', 'absent',  'Été — régime spécifique, hors alternance hebdomadaire'),
    (v_rule_damien, TIMESTAMPTZ '2027-07-04 00:00:00+02', TIMESTAMPTZ '2027-07-11 00:00:00+02', 'present', 'Été — semaine 1'),
    (v_rule_damien, TIMESTAMPTZ '2027-07-18 00:00:00+02', TIMESTAMPTZ '2027-08-08 00:00:00+02', 'present', 'Été — semaines 3, 4 et 5'),
    (v_rule_damien, TIMESTAMPTZ '2027-08-29 00:00:00+02', TIMESTAMPTZ '2027-08-30 08:30:00+02', 'present', 'Reprise du rythme scolaire');

  -- ════════════════════════════════════════════════════════════════════════
  -- 2. MARIE-ALIX / CLOTILDE — cycle de 14 jours
  --    Jour 0 = lundi de semaine ISO impaire. Jours de garde dans le cycle :
  --      0,1     lundi + mardi de la semaine impaire
  --      4,5,6   vendredi + week-end de la semaine impaire
  --      7,8     lundi + mardi de la semaine paire
  --    Le père a systématiquement mercredi + jeudi, et le week-end pair.
  --
  --    Deux règles : 2026 compte 53 semaines ISO, donc S53 et S1 sont toutes
  --    deux impaires. Un cycle de 14 jours ininterrompu se décalerait d'une
  --    semaine par rapport à la parité ISO à partir de janvier 2027 — la
  --    seconde règle recale le cycle sur le lundi de S1 (2027-01-04).
  -- ════════════════════════════════════════════════════════════════════════
  INSERT INTO recurrence_rules (
    person_id, name, pattern_type, starts_at, ends_at,
    custody_start_time, custody_end_time,
    cycle_length_days, custody_days, is_active
  ) VALUES (
    v_marie_alix,
    'Clotilde — cycle 14 j (jusqu''au 03/01/2027)',
    'custom_cycle',
    TIMESTAMPTZ '2026-09-07 00:00:00+02',
    TIMESTAMPTZ '2027-01-03 00:00:00+01',
    '08:30', '08:30',
    14, '{0,1,4,5,6,7,8}', true
  ) RETURNING id INTO v_rule_ma_1;

  INSERT INTO recurrence_rules (
    person_id, name, pattern_type, starts_at,
    custody_start_time, custody_end_time,
    cycle_length_days, custody_days, is_active
  ) VALUES (
    v_marie_alix,
    'Clotilde — cycle 14 j (à partir du 04/01/2027)',
    'custom_cycle',
    TIMESTAMPTZ '2027-01-04 00:00:00+01',
    '08:30', '08:30',
    14, '{0,1,4,5,6,7,8}', true
  ) RETURNING id INTO v_rule_ma_2;

  -- Vacances : le cycle est neutralisé sur toute la période, puis les
  -- segments réels de Marie-Alix sont posés (source de vérité §5).
  INSERT INTO recurrence_exceptions (recurrence_rule_id, start_at, end_at, type, reason) VALUES
    (v_rule_ma_1, TIMESTAMPTZ '2026-10-17 00:00:00+02', TIMESTAMPTZ '2026-11-02 08:30:00+01', 'absent',  'Toussaint — hors cycle'),
    (v_rule_ma_1, TIMESTAMPTZ '2026-10-24 00:00:00+02', TIMESTAMPTZ '2026-10-31 00:00:00+01', 'present', 'Toussaint — 2e partie'),
    (v_rule_ma_1, TIMESTAMPTZ '2026-12-19 00:00:00+01', TIMESTAMPTZ '2027-01-04 08:30:00+01', 'absent',  'Noël — hors cycle'),
    (v_rule_ma_1, TIMESTAMPTZ '2026-12-19 00:00:00+01', TIMESTAMPTZ '2026-12-20 00:00:00+01', 'present', 'Noël — 1er jour'),
    (v_rule_ma_1, TIMESTAMPTZ '2026-12-27 00:00:00+01', TIMESTAMPTZ '2027-01-04 08:30:00+01', 'present', 'Noël — 2e partie'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-02-06 00:00:00+01', TIMESTAMPTZ '2027-02-22 08:30:00+01', 'absent',  'Hiver — hors cycle'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-02-06 00:00:00+01', TIMESTAMPTZ '2027-02-15 00:00:00+01', 'present', 'Hiver — 1re partie'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-04-03 00:00:00+02', TIMESTAMPTZ '2027-04-19 08:30:00+02', 'absent',  'Printemps — hors cycle'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-04-03 00:00:00+02', TIMESTAMPTZ '2027-04-12 00:00:00+02', 'present', 'Printemps — 1re partie'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-07-03 00:00:00+02', TIMESTAMPTZ '2027-09-01 00:00:00+02', 'absent',  'Été — hors cycle'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-07-05 00:00:00+02', TIMESTAMPTZ '2027-07-12 00:00:00+02', 'present', 'Été'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-07-19 00:00:00+02', TIMESTAMPTZ '2027-07-26 00:00:00+02', 'present', 'Été'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-08-02 00:00:00+02', TIMESTAMPTZ '2027-08-16 00:00:00+02', 'present', 'Été — quinzaine'),
    (v_rule_ma_2, TIMESTAMPTZ '2027-08-30 00:00:00+02', TIMESTAMPTZ '2027-09-01 00:00:00+02', 'present', 'Fin d''été');

  RAISE NOTICE 'Règles créées : Damien=%, Clotilde 1=%, Clotilde 2=%',
    v_rule_damien, v_rule_ma_1, v_rule_ma_2;
END $$;

COMMIT;
