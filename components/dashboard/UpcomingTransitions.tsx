import type { CustodyTransition, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowUpDown } from "lucide-react"

interface UpcomingTransitionsProps {
  transitions: CustodyTransition[]
  persons: Person[]
}

export function UpcomingTransitions({ transitions, persons }: UpcomingTransitionsProps) {
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" style={{color: 'var(--color-transition)'}} />
          Prochains changements de garde
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transitions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucun changement dans les 14 prochains jours
          </p>
        ) : (
          <ul className="space-y-3">
            {transitions.map((t) => {
              const person = personById[t.person_id]
              return (
                <li key={t.id} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2"
                    style={{
                      backgroundColor: person?.color ?? 'var(--color-transition)',
                      borderColor: 'var(--color-transition)'
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {person?.name ?? "?"} — {t.direction === "pickup" ? "récupère" : "dépose"}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {format(parseISO(t.transition_at), "EEEE d MMMM à HH:mm", { locale: fr })}
                    </p>
                    {t.location && (
                      <p className="text-xs text-[var(--color-muted-foreground)]">{t.location}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
