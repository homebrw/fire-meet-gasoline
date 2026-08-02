-- ============================================================
-- Réconciliation de l'historique de migrations Supabase
-- ============================================================
-- À EXÉCUTER UNE SEULE FOIS, À LA MAIN, DANS LE SQL EDITOR,
-- AVANT de laisser l'intégration Supabase/GitHub reprendre la main.
--
-- Pourquoi
-- --------
-- Les migrations 001 à 016 ont été appliquées à la main dans le SQL Editor.
-- Le schéma est donc à jour, mais la table d'historique
-- `supabase_migrations.schema_migrations` est vide : pour l'intégration,
-- AUCUNE migration n'a jamais été appliquée. Au premier déploiement elle
-- tenterait de rejouer 001, qui échoue immédiatement
-- (« relation "persons" already exists ») et interrompt toute la série —
-- 017 et 018 ne seraient jamais atteintes.
--
-- Ce que fait ce script
-- --------------------
-- 1. Il VÉRIFIE que le schéma est bien dans l'état attendu après 016, en
--    cherchant une trace concrète laissée par chaque migration. S'il en
--    manque une, il s'arrête et liste précisément ce qui manque : il faut
--    alors passer les migrations concernées à la main avant de recommencer.
-- 2. Il enregistre 001 à 016 comme déjà appliquées, SANS exécuter leur SQL.
--    C'est l'équivalent de `supabase migration repair --status applied`.
--
-- Il ne touche à aucune donnée et ne modifie aucune table applicative.
-- Il est rejouable : les versions déjà enregistrées sont ignorées.
--
-- Après ce script, l'intégration ne verra plus que 017 et 018 comme à appliquer.

DO $$
DECLARE
  v_missing TEXT[] := '{}';
  v_before  INT;
  v_after   INT;
BEGIN
  -- ── 1. Vérification de l'état du schéma ────────────────────────────────

  -- 001 : création initiale
  IF to_regclass('public.persons')             IS NULL THEN v_missing := v_missing || '001 — table persons'::TEXT; END IF;
  IF to_regclass('public.recurrence_rules')    IS NULL THEN v_missing := v_missing || '001 — table recurrence_rules'::TEXT; END IF;
  IF to_regclass('public.recurrence_exceptions') IS NULL THEN v_missing := v_missing || '001 — table recurrence_exceptions'::TEXT; END IF;
  IF to_regclass('public.child_presences')     IS NULL THEN v_missing := v_missing || '001 — table child_presences'::TEXT; END IF;
  IF to_regclass('public.custody_transitions') IS NULL THEN v_missing := v_missing || '001 — table custody_transitions'::TEXT; END IF;
  IF to_regclass('public.events')              IS NULL THEN v_missing := v_missing || '001 — table events'::TEXT; END IF;
  IF to_regclass('public.event_attachments')   IS NULL THEN v_missing := v_missing || '001 — table event_attachments'::TEXT; END IF;

  -- 002 : suppression de recurrence_rules.handoff_time
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='recurrence_rules' AND column_name='handoff_time')
    THEN v_missing := v_missing || '002 — recurrence_rules.handoff_time est encore là'::TEXT; END IF;

  -- 003 : enfants et participants
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='persons' AND column_name='is_child')
    THEN v_missing := v_missing || '003 — persons.is_child'::TEXT; END IF;
  IF to_regclass('public.event_participants') IS NULL THEN v_missing := v_missing || '003 — table event_participants'::TEXT; END IF;

  -- 004 : politiques des pièces jointes. Seule event_attachments_delete est
  -- propre à cette migration (003 crée déjà select et insert). Les politiques
  -- sur storage.objects ne sont PAS un marqueur : elles sont en commentaire
  -- dans le fichier, à créer à la main depuis le dashboard Storage.
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='event_attachments'
                   AND policyname='event_attachments_delete')
    THEN v_missing := v_missing || '004 — politique event_attachments_delete'::TEXT; END IF;

  -- 005 : événements sur la journée
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='events' AND column_name='is_all_day')
    THEN v_missing := v_missing || '005 — events.is_all_day'::TEXT; END IF;

  -- 006 : index sur is_all_day
  IF to_regclass('public.idx_events_all_day') IS NULL THEN v_missing := v_missing || '006 — index idx_events_all_day'::TEXT; END IF;

  -- 007 : fonction de couleur des enfants
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='lighten_color')
    THEN v_missing := v_missing || '007 — fonction lighten_color'::TEXT; END IF;

  -- 008 : suppression de events.type
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='type')
    THEN v_missing := v_missing || '008 — events.type est encore là'::TEXT; END IF;

  -- 009 : modèle de propriété des événements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='events' AND column_name='owner_person_id')
    THEN v_missing := v_missing || '009 — events.owner_person_id'::TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='events' AND column_name='visibility')
    THEN v_missing := v_missing || '009 — events.visibility'::TEXT; END IF;

  -- 010 : réécriture des politiques de event_participants.
  -- Aucune trace distinctive : les politiques portent les mêmes noms qu'en
  -- 003 et leur définition ne diffère pas de façon détectable. Marquée comme
  -- appliquée sans vérification indépendante — sans conséquence, la rejouer
  -- à la main ne ferait que redéfinir les mêmes politiques.

  -- 011 : lien exception -> garde générée
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='child_presences' AND column_name='exception_id')
    THEN v_missing := v_missing || '011 — child_presences.exception_id'::TEXT; END IF;

  -- 012 : intégrations calendrier
  IF to_regclass('public.calendar_connections') IS NULL THEN v_missing := v_missing || '012 — table calendar_connections'::TEXT; END IF;

  -- 013 : import de calendrier
  IF to_regclass('public.calendar_import_candidates') IS NULL THEN v_missing := v_missing || '013 — table calendar_import_candidates'::TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='events' AND column_name='imported_from_connection_id')
    THEN v_missing := v_missing || '013 — events.imported_from_connection_id'::TEXT; END IF;

  -- 014 : surveillance Google Calendar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='calendar_connections' AND column_name='google_channel_id')
    THEN v_missing := v_missing || '014 — calendar_connections.google_channel_id'::TEXT; END IF;

  -- 015 : visibilité des événements pour les participants
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='events' AND policyname='events_select'
                   AND qual LIKE '%event_participants%')
    THEN v_missing := v_missing || '015 — politique events_select ne tient pas compte des participants'::TEXT; END IF;

  -- 016 : refonte des exceptions (présent/absent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='recurrence_exceptions' AND column_name='start_at')
    THEN v_missing := v_missing || '016 — recurrence_exceptions.start_at'::TEXT; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='recurrence_exceptions' AND column_name='person_id')
    THEN v_missing := v_missing || '016 — recurrence_exceptions.person_id est encore là'::TEXT; END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION E'Le schéma n''est pas dans l''état attendu après la migration 016.\nÉléments manquants :\n  - %\nPassez les migrations concernées à la main, puis relancez ce script.',
      array_to_string(v_missing, E'\n  - ');
  END IF;

  RAISE NOTICE 'Schéma vérifié : conforme à l''état attendu après 016.';

  -- ── 2. Enregistrement de l'historique ──────────────────────────────────
  -- Structure identique à celle que crée la CLI Supabase.
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version TEXT NOT NULL PRIMARY KEY);
  ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements TEXT[];
  ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name TEXT;

  SELECT count(*) INTO v_before FROM supabase_migrations.schema_migrations;

  INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
    ('001', 'initial'),
    ('002', 'remove_handoff_time'),
    ('003', 'add_participants_and_children'),
    ('004', 'attachments_storage'),
    ('005', 'add_all_day_events'),
    ('006', 'add_missing_event_columns'),
    ('007', 'update_children_colors'),
    ('008', 'remove_event_type'),
    ('009', 'migrate_event_type_to_ownership_model'),
    ('010', 'fix_event_participants_rls'),
    ('011', 'add_exception_id_to_custody'),
    ('012', 'calendar_integrations'),
    ('013', 'calendar_import'),
    ('014', 'calendar_watch_and_badges'),
    ('015', 'fix_event_visibility_for_participants'),
    ('016', 'rework_recurrence_exceptions')
  ON CONFLICT (version) DO NOTHING;

  SELECT count(*) INTO v_after FROM supabase_migrations.schema_migrations;

  RAISE NOTICE 'Historique : % version(s) ajoutée(s), % enregistrée(s) au total.',
    v_after - v_before, v_after;
  RAISE NOTICE 'Les migrations non listées ci-dessous seront appliquées par l''intégration.';
END $$;

-- Contrôle final : doit lister au moins 001 à 016.
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
