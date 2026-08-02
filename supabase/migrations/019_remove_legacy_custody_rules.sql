-- ============================================================
-- Suppression des anciennes règles de garde, remplacées par 018
-- ============================================================
-- La base contenait déjà 4 règles créées avant ce chantier, que 018 n'a
-- pas touchées (il ne nettoie que les règles portant ses propres noms) :
--   - Garde Alternée Marie-Alix.
--   - Garde Alternée Damien 2025-2026
--   - Vacances été 2026
--   - Garde Alternée Damien 2026-2027
-- Elles couvraient les mêmes personnes que les 3 règles créées par 018 sur
-- des périodes qui se chevauchent : les garder actives aurait fait générer
-- des gardes en double pour Damien et Marie-Alix. Confirmé par
-- l'utilisateur : à supprimer.
--
-- Idempotente : sans effet si ces règles ont déjà été supprimées.

DO $$
DECLARE
  v_old UUID[];
BEGIN
  SELECT array_agg(id) INTO v_old
  FROM recurrence_rules
  WHERE name IN (
    'Garde Alternée Marie-Alix.',
    'Garde Alternée Damien 2025-2026',
    'Vacances été 2026',
    'Garde Alternée Damien 2026-2027'
  );

  IF v_old IS NOT NULL THEN
    -- child_presences et custody_transitions référencent recurrence_rules
    -- sans ON DELETE CASCADE : à retirer avant de supprimer les règles.
    DELETE FROM child_presences     WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM custody_transitions WHERE recurrence_rule_id = ANY(v_old);
    DELETE FROM recurrence_rules    WHERE id = ANY(v_old); -- cascade sur les exceptions
    RAISE NOTICE '% règle(s) historique(s) supprimée(s).', array_length(v_old, 1);
  ELSE
    RAISE NOTICE 'Aucune règle historique trouvée (déjà supprimées, ou noms différents).';
  END IF;
END $$;
