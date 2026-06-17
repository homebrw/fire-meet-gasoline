# State Management Components

Ce document explique comment utiliser les nouveaux composants d'état (empty, loading, error) dans Famille Sync.

## Components Disponibles

### 1. `EmptyState`
Affiche un message quand aucune donnée n'existe.

**Utilisation:**
```tsx
import { EmptyState } from "@/components/state"
import { Calendar } from "lucide-react"

<EmptyState
  icon={Calendar}
  title="Aucune règle créée"
  description="Commencez par créer votre première règle de garde"
  action={{
    label: "Créer une règle",
    href: "/settings/rules"
  }}
/>
```

### 2. `ErrorState`
Affiche une alerte d'erreur avec option de retry.

**Utilisation:**
```tsx
import { ErrorState } from "@/components/state"

<ErrorState
  title="Erreur lors du chargement"
  description="Impossible de charger vos données. Vérifiez votre connexion."
  onRetry={() => location.reload()}
/>
```

### 3. `LoadingState`
Affiche des skeleton loaders pendant le chargement asynchrone.

**Utilisation:**
```tsx
import { LoadingState } from "@/components/state"

<LoadingState variant="card" count={2} />
// or
<LoadingState variant="list" count={3} />
// or
<LoadingState variant="grid" count={4} />
```

### 4. `ContentCard`
Wrapper réutilisable qui gère tous les états (loading, error, empty, content).

**Utilisation:**
```tsx
import { ContentCard } from "@/components/state"

<ContentCard
  title="Mes Événements"
  icon={CalendarIcon}
  isEmpty={events.length === 0}
  isLoading={isLoading}
  error={error ? {
    title: "Erreur",
    description: error.message,
    onRetry: refetch
  } : undefined}
  emptyState={{
    title: "Aucun événement",
    description: "Créez votre premier événement",
    action: { label: "Créer", onClick: onCreate }
  }}
>
  {/* Your content here */}
</ContentCard>
```

### 5. `Toast`
Notification temporaire pour les messages de succès/erreur après une action.

**Utilisation:**
```tsx
import { Toast } from "@/components/state"
import { useState } from "react"

const [toast, setToast] = useState(null)

<Toast
  message="Règle sauvegardée avec succès"
  type="success"
  autoCloseDuration={3000}
  onClose={() => setToast(null)}
/>
```

### 6. `SettingsSection`
Container pour les sections de paramètres avec gestion d'états.

**Utilisation:**
```tsx
import { SettingsSection } from "@/components/settings/SettingsSection"

<SettingsSection
  title="Règles de Garde"
  icon={RulesIcon}
  isEmpty={rules.length === 0}
  isLoading={isLoading}
  emptyState={{
    title: "Aucune règle créée",
    description: "Commencez par créer votre première règle",
    action: { label: "Créer", onClick: onAdd }
  }}
>
  {/* List of rules */}
</SettingsSection>
```

### 7. `SettingsItemList`
Wrapper pour listes dans les paramètres avec états.

**Utilisation:**
```tsx
import { SettingsItemList } from "@/components/settings/SettingsItemList"

<SettingsItemList
  isEmpty={items.length === 0}
  isLoading={isLoading}
  emptyTitle="Aucun élément"
  emptyIcon={PlusIcon}
  onAddClick={handleAdd}
>
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</SettingsItemList>
```

### 8. `DashboardSection`
Wrapper pour sections du dashboard avec états.

**Utilisation:**
```tsx
import { DashboardSection } from "@/components/dashboard/DashboardSection"

<DashboardSection
  title="Transitions à Venir"
  icon={CarIcon}
  isEmpty={transitions.length === 0}
  isLoading={isLoading}
>
  {/* Your transitions */}
</DashboardSection>
```

## Design Guidelines

### Colors & Contrast
- **Empty state**: Icône grise (muted), pas de couleur d'alerte
- **Loading state**: Skeletal, couleur muted (#f4f4f5)
- **Error state**: Destructive rouge (#ef4444), toujours avec texte explicatif
- **Success toast**: Vert available (#22c55e)

### Accessibility
- Tous les états ont des messages textuels (pas de couleur seule)
- Focus rings visibles
- Support `prefers-reduced-motion`
- Icons utilisés avec labels textuels

### Localization
- Tous les messages sont en français
- Utiliser des termes domaine (garde, créneau, dépôt/récupération)
- Pas de jargon technique dans les messages utilisateur

## Implementation Timeline

### Phase 1 (Complete) ✅
- ✅ Composants de base créés (EmptyState, ErrorState, LoadingState, Toast)
- ✅ Composants wrapper (ContentCard, SettingsSection)
- ✅ Dashboard page mise à jour avec gestion erreur

### Phase 2 (Next)
- [ ] Intégrer dans pages Settings (rules, custody, events, exceptions)
- [ ] Intégrer dans Calendar page
- [ ] Intégrer dans Week page
- [ ] Ajouter animations de transition (fade-in pour contenus)
- [ ] Ajouter système de toasts global via Context

### Phase 3 (Future)
- [ ] Tests automatisés pour chaque état
- [ ] Visual regression testing
- [ ] Performance audit (skeleton rendering)
- [ ] A/B test empty state copy effectiveness
