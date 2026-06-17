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

Créez un fichier `.env.local` à la racine du projet:
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
```

Obtenez ces valeurs depuis votre [Tableau de Bord Supabase](https://supabase.com/dashboard)

4. **Lancez le serveur de développement**
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du Projet

```
fire-meet-gasoline/
├── app/                          # App Router Next.js
│   ├── (app)/                    # Routes protégées par authentification
│   │   ├── today/                # Vue des événements du jour
│   │   ├── week/                 # Planificateur hebdomadaire
│   │   ├── calendar/             # Vues calendaires
│   │   ├── settings/             # Pages de configuration
│   │   │   ├── rules/            # Gestion des règles d'événements
│   │   │   ├── custody/          # Configuration des plannings de garde
│   │   │   ├── events/           # Définitions d'événements
│   │   │   └── exceptions/       # Gestion des exceptions
│   │   └── layout.tsx            # Shell application (sidebar + nav)
│   ├── (auth)/                   # Routes d'authentification
│   │   └── login/                # Page de connexion
│   ├── api/                      # Routes API
│   │   ├── upload/               # Point de terminaison d'upload
│   │   └── auth/callback/        # Callback OAuth
│   ├── layout.tsx                # Layout racine
│   ├── page.tsx                  # Page d'accueil
│   └── globals.css               # Styles Tailwind
├── components/
│   ├── ui/                       # Primitives Radix UI
│   ├── layout/                   # Composants Sidebar, BottomNav
│   ├── dashboard/                # Cartes du tableau de bord
│   ├── calendar/                 # Composants calendaires
│   └── week/                     # Composants de planification
├── lib/                          # Utilitaires et helpers
│   └── supabase.ts               # Configuration client Supabase
├── supabase/                     # Migrations de base de données
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

### Style de Code
- **TypeScript**: Mode strict activé
- **Composants**: Composants fonctionnels avec hooks
- **Styling**: Utilitaires Tailwind CSS uniquement (pas de modules CSS)
- **Imports**: Utilisez l'alias `@/` pour les imports à partir de la racine

### Exemples d'Import
```typescript
import { Button } from "@/components/ui/button"
import { client } from "@/lib/supabase"
import { calculateDates } from "@/lib/utils"
```

### Ajouter des Fonctionnalités
1. Créez une page dans `app/(app)/nom-de-la-fonctionnalite/`
2. Ajoutez les composants dans `components/nom-de-la-fonctionnalite/`
3. Utilisez React Hook Form + Zod pour la validation de formulaires
4. Interrogez Supabase en utilisant le client fourni

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

## Support

Pour les problèmes et questions:
- 📧 Créez une issue sur GitHub
- 💬 Vérifiez les issues existantes pour des solutions
- 📚 Consultez [CLAUDE.md](./CLAUDE.md) pour les détails techniques

---

Construit avec ❤️ en utilisant Next.js et Supabase
