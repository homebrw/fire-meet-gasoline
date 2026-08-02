# Scripts SQL à passer à la main

Scripts qui ne sont **pas** des migrations : ils doivent être exécutés
manuellement dans le SQL Editor Supabase, en général une seule fois. Ils sont
volontairement hors de `supabase/migrations/` pour ne pas être ramassés par
l'intégration Supabase/GitHub.

## `backfill_migration_history.sql`

Réconcilie l'historique de migrations avec la réalité de la base.

### Le problème

Les migrations `001` à `016` ont été appliquées à la main dans le SQL Editor.
Le schéma est donc à jour, mais la table `supabase_migrations.schema_migrations`
est vide : pour l'intégration Supabase/GitHub, aucune migration n'a jamais été
appliquée. Au premier déploiement automatique, elle rejoue `001`, qui échoue
aussitôt (`relation "persons" already exists`) et **interrompt toute la série** —
les migrations suivantes ne sont jamais atteintes.

Écrire une migration « qui rejoue tout de façon idempotente » ne règle rien :
elle porterait un numéro supérieur et la série mourrait avant de l'atteindre.

### La procédure, dans l'ordre

1. **Vérifier l'état actuel** — dans le SQL Editor :
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
   ```
   Table ou schéma inexistant, ou résultat vide : l'historique est bien à
   reconstituer. Si `001` à `016` y figurent déjà, il n'y a rien à faire.

2. **Exécuter `backfill_migration_history.sql`.** Il commence par vérifier que
   le schéma est réellement dans l'état attendu après `016`, en cherchant une
   trace concrète laissée par chaque migration. S'il en manque une, il s'arrête
   et nomme précisément ce qui manque, sans rien écrire — il faut alors passer
   les migrations concernées à la main, puis relancer.

3. **Vérifier** que `001` à `016` sont bien enregistrées (le script les liste
   en sortie).

4. **Merger la branche.** L'intégration n'appliquera plus que les migrations
   réellement nouvelles.

### Ce qu'il ne fait pas

Il n'exécute aucun SQL des migrations `001` à `016` et ne touche à aucune
donnée applicative. C'est l'équivalent de
`supabase migration repair --status applied <version>`, en SQL.

Une seule migration échappe à la vérification : `010`, qui se contente de
réécrire des politiques RLS portant les mêmes noms qu'en `003`, sans trace
distinctive. La rejouer à la main serait de toute façon sans conséquence.

### Vérifié comment

Le scénario complet a été rejoué sur un PostgreSQL 16 local avec la vraie CLI
Supabase : schéma `001`→`016` appliqué à la main, historique vide, puis
`supabase db push`. Sans le script, le push meurt sur `001`. Avec, il
n'applique que les migrations nouvelles.
