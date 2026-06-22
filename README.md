# Fire Meet Gasoline 🔥

Une application web moderne de gestion calendaire et d'événements construite avec **Next.js 16**, **React 19** et **Supabase** pour organiser les événements, les plannings de garde et les règles de transition.

## Fonctionnalités

✨ **Capacités principales**
- 📅 Vue calendaire complète avec gestion d'événements
- 📋 Planification hebdomadaire avec support du drag-and-drop
- 👥 Gestion des plannings de garde
- ⚙️ Règles d'événements et exceptions personnalisables
- 🔐 Authentification sécurisée avec Supabase
- 📱 Design responsive optimisé pour mobile
- 🎨 Interface moderne avec composants Radix

## Stack Technologique

- **Frontend**: Next.js 16.2.9, React 19.2.4, TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI, composants shadcn
- **Backend**: Supabase (PostgreSQL + Auth)
- **Formulaires**: React Hook Form + validation Zod
- **Icônes**: Lucide React
- **Hébergement**: Prêt pour Vercel (ou auto-hébergé)

## Démarrage Rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

1. **Clonez le dépôt**
```bash
git clone https://github.com/homebrw/fire-meet-gasoline.git
cd fire-meet-gasoline
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Configurez les variables d'environnement**

Copiez `.env.example` vers `.env.local` et renseignez les valeurs:
```bash
cp .env.example .env.local
```

Obtenez ces valeurs depuis votre [Tableau de Bord Supabase](https://supabase.com/dashboard) (Project Settings > API).

4. **Lancez le serveur de développement**
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du Projet

```
fire-meet-gasoline/
├── app/
│   ├── (app)/                    # Routes protégées par authentification
│   │   ├── today/                # Vue des événements du jour
│   │   ├── week/                 # Planificateur hebdomadaire
│   │   ├── calendar/             # Vues calendaires
│   │   ├── settings/             # Pages de configuration
│   │   │   ├── rules/            # Gestion des règles de récurrence
│   │   │   ├── custody/          # Configuration des plannings de garde
│   │   │   ├── events/           # Définitions d'événements
│   │   │   ├── exceptions/       # Gestion des exceptions
│   │   │   ├── children/         # Gestion des enfants/personnes
│   │   │   └── activity/         # Journal d'activité
│   │   └── layout.tsx            # Shell application (sidebar + nav)
│   ├── (auth)/
│   │   └── login/                # Page de connexion
│   ├── api/
│   │   ├── upload/                # Point de terminaison d'upload
│   │   └── attachments/download/  # Téléchargement de pièces jointes
│   ├── auth/callback/             # Callback OAuth
│   ├── layout.tsx                 # Layout racine
│   ├── page.tsx                   # Page d'accueil
│   └── globals.css                # Styles Tailwind
├── components/
│   ├── ui/                       # Primitives Radix UI / shadcn
│   ├── layout/                   # Sidebar, BottomNav
│   ├── dashboard/                # Cartes du tableau de bord
│   ├── calendar/                 # Composants calendaires
│   ├── custody/                  # UI spécifique à la garde
│   ├── week/                     # Composants de planification
│   └── forms/, events/, settings/, state/, shared/, file-upload/
├── lib/
│   ├── actions/                  # Server actions (children, custody, events, recurrence, revalidate)
│   ├── recurrence/                # Moteur de récurrence — voir lib/recurrence/README.md
│   ├── hooks/                     # Hooks React (useEventAttachments, ...)
│   ├── providers/                 # Context providers (thème, ...)
│   ├── types/                     # Types TypeScript partagés
│   ├── supabase/                  # client.ts (navigateur) / server.ts (SSR)
│   └── datetime.ts, timezone.ts, utils.ts
├── supabase/migrations/          # Migrations de base de données
├── public/                       # Ressources statiques
└── proxy.ts                      # Middleware et logique d'authentification
```

## Scripts Disponibles

| Commande | Objectif |
|----------|----------|
| `npm run dev` | Démarrer le serveur de développement avec rechargement à chaud |
| `npm run build` | Vérifier les types et construire pour la production |
| `npm start` | Démarrer le serveur de production |
| `npm run lint` | Exécuter le linter ESLint |

## Guide de Développement

### Architecture & Patterns

#### Server Actions
La majorité des mutations de données utilisent les **Server Actions** de Next.js (fichiers dans `lib/actions/`) avec:
- Directive `"use server"` au début de chaque fichier d'action
- Validation Zod intégrée à chaque action
- `revalidatePath()` pour invalider les caches après mutations
- Appels directs au client Supabase (pas de routes API pour le CRUD)

Exemples: `lib/actions/events.ts`, `lib/actions/custody.ts`, `lib/actions/recurrence.ts`

#### Moteur de Récurrence
Logique métier complexe dans `lib/recurrence/` pour la planification des gardes avec trois types (`weekly_alternating`, `custom_cycle`, `manual`). Le moteur (`engine.ts`) expand les `RecurrenceRule` en `GeneratedPeriod[]` sur une plage de dates et applique les `RecurrenceException`. Voir [`lib/recurrence/README.md`](./lib/recurrence/README.md) pour le détail de l'algorithme avant d'y toucher.

### Style de Code
- **TypeScript**: Mode strict activé, alias `@/*` pour imports
- **Composants**: Fonctionnels avec hooks React 19
- **Styling**: Utilitaires Tailwind CSS uniquement (pas de modules CSS)
- **Validation**: React Hook Form + Zod pour tous les formulaires
- **Database**: Client Supabase type-safe

### Exemples d'Import
```typescript
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client" // navigateur
import { calculateDates } from "@/lib/utils"
```

### Ajouter des Fonctionnalités
1. Créez une page dans `app/(app)/nom-de-la-fonctionnalite/`
2. Ajoutez les composants dans `components/nom-de-la-fonctionnalite/`
3. Pour les mutations: créez une server action dans `lib/actions/`
4. Utilisez React Hook Form + Zod pour la validation
5. Appelez le client Supabase directement ou via des actions serveur

## Authentification

L'application utilise l'**Authentification Supabase** avec protection middleware:
- Les utilisateurs non authentifiés sont redirigés vers `/login`
- L'état d'authentification est géré dans le middleware `proxy.ts`
- Gestionnaire de callback OAuth à `/auth/callback`
- Toutes les routes `/(app)/*` nécessitent une authentification

## Base de Données

Le schéma de base de données et les migrations se trouvent dans le répertoire `supabase/`:
- Exécutez les migrations via le tableau de bord Supabase ou la CLI
- Utilisez le client Supabase type-safe pour les requêtes
- Les abonnements en temps réel sont disponibles

### Modèle de Données Principal
- **Person**: Individus (parents/tuteurs) avec couleur + avatar
- **RecurrenceRule**: Modèle de planning de garde (pattern + timing)
- **RecurrenceException**: Surcharges pour un occurrence unique (annul/déplac/extension/raccourc/ajout)
- **ChildPresence**: Période de garde générée (délimitée temporellement)
- **CustodyTransition**: Événement de prise en charge/remise (lieu défini)
- **CalendarEvent**: Événements partagés ou individuels (pièces jointes optionnelles)

## Déploiement

### Vercel (Recommandé)
```bash
npm run build
# Déployez avec la CLI Vercel ou un git push
```

### Auto-Hébergé
```bash
npm run build
npm start
```

Assurez-vous que les variables d'environnement sont définies sur votre plateforme d'hébergement.

## Contribution

1. Créez une branche de fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
2. Committez vos changements (`git commit -m 'Ajouter ma fonctionnalité'`)
3. Poussez vers la branche (`git push origin feature/ma-fonctionnalite`)
4. Ouvrez une Pull Request

## Dépannage

### Le port 3000 est déjà utilisé
```bash
npm run dev -- -p 3001
```

### Erreurs de connexion Supabase
- Vérifiez que `.env.local` contient les bonnes identifiants
- Vérifiez que le projet Supabase est actif
- Assurez-vous d'avoir une connexion réseau

### Erreurs de build
- Exécutez `npm install` pour mettre à jour les dépendances
- Nettoyez le dossier `.next`: `rm -rf .next`
- Vérifiez la version de Node.js: `node --version`

## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour les détails.

## Notes Importantes

### Next.js 16
⚠️ Cette version introduit des changements importants par rapport aux versions antérieures. Consultez la documentation Next.js 16 avant d'ajouter du code. Prêtez attention aux avis de dépréciation.

## Support

Pour les problèmes et questions:
- 📧 Créez une issue sur GitHub
- 💬 Vérifiez les issues existantes pour des solutions
- 📚 Consultez [CLAUDE.md](./CLAUDE.md) pour les détails techniques approfondis, ou les guides dans [`.claude/`](./.claude/README.md) (workflow, TypeScript, Supabase, conventions API)

---

Construit avec ❤️ en utilisant Next.js et Supabase
