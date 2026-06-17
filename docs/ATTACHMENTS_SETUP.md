# Setup des Attachments

Ce document décrit comment configurer le stockage des attachments dans Supabase.

## Prérequis

- Accès au dashboard Supabase
- Migration 004 appliquée (`npm run migrate`)

## Étapes de setup

### 1. Créer le bucket Storage

1. Allez dans Supabase Dashboard → **Storage**
2. Cliquez sur **Create bucket**
3. Nommez-le `attachments`
4. **Décochez** "Public bucket" (non-public)
5. Créez le bucket

Ou via SQL dans Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);
```

### 2. Configurer les Storage Policies

Les politiques de stockage contrôlent l'accès au niveau du bucket. Ils travaillent en conjonction avec les RLS policies de la base de données.

1. Allez dans **Storage** → **attachments** → **Policies**
2. Cliquez sur **New Policy** et répétez les étapes suivantes pour chaque politique

#### Politique 1: Télécharger (SELECT)

Nom: `authenticated_can_download_events`

```sql
SELECT
USING (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
)
```

Explication: Tout utilisateur authentifié peut tenter de télécharger (l'accès réel est contrôlé par les RLS policies de `event_attachments`)

#### Politique 2: Uploader (INSERT)

Nom: `authenticated_can_upload_events`

```sql
INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
  AND name LIKE 'events/%'
)
```

Explication: Tout utilisateur authentifié peut uploader dans le dossier `events/` (accès au event spécifique contrôlé par l'API route)

#### Politique 3: Supprimer (DELETE)

Nom: `owner_can_delete_events`

```sql
DELETE
USING (
  bucket_id = 'attachments'
  AND auth.role() = 'authenticated'
  AND name LIKE 'events/%'
)
```

Explication: Seuls les propriétaires d'événements peuvent supprimer (contrôlé par l'API route et les RLS policies)

### 3. Vérifier les RLS Policies (Base de données)

Les RLS policies sur la table `event_attachments` devraient être configurées par la migration 004. Vérifiez dans **SQL Editor**:

```sql
SELECT * FROM pg_policies WHERE tablename = 'event_attachments';
```

Vous devriez voir:
- `event_attachments_select`
- `event_attachments_insert`
- `event_attachments_delete`

## Règles d'accès

**Règle simple: Si tu vois l'événement, tu vois les attachments.**

### Cas d'accès:

| Cas | Event visibility | Rôle | Accès attachments |
|-----|------------------|------|-------------------|
| Propriétaire | any | Propriétaire | ✅ Lecture + Upload + Delete |
| Shared event | both | Autre parent | ✅ Lecture + Upload |
| Shared event | both | Participant | ✅ Lecture + Upload |
| Private event | private | Autre parent | ❌ Interdit |
| Private event | private | Participant | ✅ Lecture + Upload |
| Private event | private | Participant (no access to event) | ❌ Interdit |

## Points d'accès (API Routes)

- **Upload**: POST `/api/upload` (vérifie droits au event)
- **Download**: GET `/api/attachments/download/[...path]` (vérifie droits au event)
- **Delete**: Via server action `deleteAttachment()` (nécessite propriétaire)

## Colonnes de données

La colonne `allow_participants_to_see_attachments` sur la table `events` existe toujours en base pour compatibilité, mais n'est plus utilisée par la logique d'accès (qui suit maintenant juste la visibilité de l'événement).

## Notes de sécurité

- Les chemins de stockage respectent la structure `events/{event_id}/{timestamp}.{ext}`
- L'access control à trois niveaux:
  1. Authentification (utilisateur loggé)
  2. RLS policies (visibilité événement)
  3. API routes (permissions spécifiques)
- Les fichiers sont supprimés de Storage ET de la base quand un attachment est supprimé

## Dépannage

### Erreur "Bucket not found"

→ Créez le bucket via Supabase Dashboard (étape 1)

### Erreur "Upload forbidden" sur API

→ Vérifiez que l'utilisateur peut voir l'événement

### Fichier uploadé mais pas visible

→ Vérifiez les RLS policies sur `event_attachments` table
