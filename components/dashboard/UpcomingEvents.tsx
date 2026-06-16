import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays } from "lucide-react"

interface UpcomingEventsProps {
  events: CalendarEvent[]
  persons: Person[]
}

export function UpcomingEvents({ events, persons }: UpcomingEventsProps) {
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          Prochains événements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucun événement dans les 14 prochains jours
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => {
              const owner = ev.owner_person_id ? personById[ev.owner_person_id] : null
              return (
                <li key={ev.id} className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{ev.title}</span>
                    {ev.type === "shared" ? (
                      <Badge variant="secondary" className="text-xs">Commun</Badge>
                    ) : (
                      <Badge
                        className="text-xs"
                        style={
                          owner
                            ? { backgroundColor: owner.color + "20", color: owner.color }
                            : undefined
                        }
                      >
                        {owner?.name ?? "Individuel"}
                      </Badge>
                    )}
                    {ev.is_blocking && (
                      <Badge variant="destructive" className="text-xs">Bloquant</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {format(parseISO(ev.start_at), "EEEE d MMMM à HH:mm", { locale: fr })}
                  </p>
                  {ev.location && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">📍 {ev.location}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
