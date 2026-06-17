"use client"

import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"
import { EventCard } from "@/components/events/EventCard"

interface UpcomingEventsProps {
  events: CalendarEvent[]
  persons: Person[]
}

export function UpcomingEvents({ events, persons }: UpcomingEventsProps) {
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
          <ul className="space-y-3 divide-y divide-[var(--color-border)]">
            {events.map((ev) => (
              <li key={ev.id} className="pt-3 first:pt-0">
                <EventCard event={ev} persons={persons} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
