# Integration Guide: State Management Components

Ce guide montre comment intégrer les nouveaux composants de gestion d'état dans les pages existantes.

## Exemple 1: Page Settings (Règles) - Avant/Après

### Avant (état vide minimal)
```tsx
{rules.length === 0 ? (
  <Card>
    <CardContent className="py-8 text-center">
      Aucune règle de récurrence. Créez-en une pour commencer.
    </CardContent>
  </Card>
) : (
  // afficher les règles
)}
```

### Après (meilleure UX)
```tsx
import { EmptyState } from "@/components/state"
import { Plus } from "lucide-react"

{rules.length === 0 ? (
  <EmptyState
    icon={Plus}
    title="Aucune règle créée"
    description="Commencez par créer votre première règle de garde pour configurer le planning"
    action={{
      label: "Créer une règle",
      onClick: () => setCreateOpen(true)
    }}
  />
) : (
  // afficher les règles
)}
```

## Exemple 2: Page avec Chargement Asynchrone

### Avant (pas de feedback de chargement)
```tsx
const [data, setData] = useState<Item[]>([])

useEffect(() => {
  async function load() {
    const res = await supabase.from("items").select("*")
    setData(res.data ?? [])
  }
  load()
}, [])

return <div>{data.map(item => ...)}</div>
```

### Après (avec loading state)
```tsx
import { LoadingState } from "@/components/state"
import { ContentCard } from "@/components/state"

const [data, setData] = useState<Item[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

useEffect(() => {
  async function load() {
    try {
      setIsLoading(true)
      const res = await supabase.from("items").select("*")
      if (res.error) throw res.error
      setData(res.data ?? [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }
  load()
}, [])

return (
  <ContentCard
    title="Mes Éléments"
    isEmpty={data.length === 0}
    isLoading={isLoading}
    error={error ? {
      title: "Erreur lors du chargement",
      description: error.message,
      onRetry: () => { /* reload */ }
    } : undefined}
    emptyState={{
      title: "Aucun élément",
      description: "Créez votre premier élément",
      action: { label: "Créer", onClick: onCreate }
    }}
  >
    <div className="space-y-2">
      {data.map(item => (...))}
    </div>
  </ContentCard>
)
```

## Exemple 3: Notification de Succès après Action

### Avant (pas de feedback)
```tsx
async function handleSave() {
  await saveItem(item)
  // Utilisateur ignore s'il a sauvegardé
}
```

### Après (avec toast)
```tsx
import { Toast } from "@/components/state"
import { useState } from "react"

const [toast, setToast] = useState<{
  message: string
  type: "success" | "error"
} | null>(null)

async function handleSave() {
  try {
    await saveItem(item)
    setToast({ message: "Règle sauvegardée", type: "success" })
  } catch (err) {
    setToast({ message: "Erreur lors de la sauvegarde", type: "error" })
  }
}

return (
  <>
    {/* ... form ... */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
  </>
)
```

## Exemple 4: Settings Section (Paramètres)

```tsx
import { SettingsSection } from "@/components/settings/SettingsSection"
import { Trash2 } from "lucide-react"

<SettingsSection
  title="Mes Événements"
  icon={Trash2}
  isEmpty={events.length === 0}
  isLoading={isLoading}
  error={error ? {
    title: "Erreur",
    description: error.message,
    onRetry: refetch
  } : undefined}
  emptyState={{
    title: "Aucun événement créé",
    description: "Ajoutez votre premier événement pour le partager",
    action: { label: "Ajouter un événement", onClick: onAdd }
  }}
>
  {events.map(event => (...))}
</SettingsSection>
```

## Intégration Étape par Étape

### 1. Ajouter les imports
```tsx
import { 
  EmptyState, 
  ErrorState, 
  LoadingState, 
  ContentCard,
  Toast 
} from "@/components/state"
```

### 2. Ajouter les states
```tsx
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<Error | null>(null)
const [toast, setToast] = useState(null)
```

### 3. Mettre à jour le rendu
```tsx
// Combiner loading, error, empty, et content states
return (
  <ContentCard
    isEmpty={data.length === 0}
    isLoading={isLoading}
    error={error ? { ... } : undefined}
    emptyState={{ ... }}
  >
    {/* Contenu normal */}
  </ContentCard>
)

// Ajouter notification de succès
{toast && <Toast {...} />}
```

## Priorités d'Intégration

1. **Haute Priorité** (core user paths)
   - [ ] Settings: Rules page (custody schedule setup)
   - [ ] Settings: Persons page (family setup)
   - [ ] Calendar page (main planning view)

2. **Moyenne Priorité** (supporting features)
   - [ ] Settings: Events page
   - [ ] Settings: Custody page
   - [ ] Settings: Exceptions page
   - [ ] Week view page

3. **Basse Priorité** (nice-to-have)
   - [ ] Login page (auth states)
   - [ ] Form submissions (inline error messages)
   - [ ] Global error boundary

## Testing Checklist

Pour chaque intégration, vérifier:
- [ ] Empty state affiche avec message clair et action
- [ ] Loading state affiche skeletal placeholders
- [ ] Error state affiche avec option retry
- [ ] Content charge et affiche correctement
- [ ] Success toast notifie après action
- [ ] Animations respectent `prefers-reduced-motion`
- [ ] Contrast ≥4.5:1 sur tous les textes
- [ ] Accessible au clavier et screen reader
- [ ] Responsive sur mobile/tablet/desktop

## Performance Notes

- LoadingState use `animate-pulse` (GPU-optimized)
- Toast auto-closes (configurable duration)
- EmptyState doesn't re-render on data updates
- Use `useTransition()` pour les actions asynchrones
- Consider `<Suspense>` pour async components
