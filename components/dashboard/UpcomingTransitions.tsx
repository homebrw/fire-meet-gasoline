import type { CustodyTransition, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { indexById } from "@/lib/utils"
import { TRANSITION_DIRECTION_LABEL } from "@/lib/recurrence/labels"

interface UpcomingTransitionsProps {
  transitions: CustodyTransition[]
  persons: Person[]
}

export function UpcomingTransitions({ transitions, persons }: UpcomingTransitionsProps) {
  const personById = indexById(persons)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" style={{color: 'var(--color-transition-badge-text)'}} />
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
              const Icon = t.direction === "pickup" ? ArrowUp : ArrowDown
              return (
                <li key={t.id} className="flex items-start gap-3">
                  <Icon
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    style={{ color: person?.color ?? 'var(--color-transition-badge-text)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {person?.name ?? "?"} — {TRANSITION_DIRECTION_LABEL[t.direction]}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {format(parseISO(t.transition_at), "EEEE d MMMM à HH:mm", { locale: fr })}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {(() => {
                        const daysUntilTransition = differenceInDays(parseISO(t.transition_at), new Date())
                        return daysUntilTransition === 0 ? "Aujourd'hui" : `Dans ${daysUntilTransition} jour${daysUntilTransition > 1 ? "s" : ""}`
                      })()}
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
