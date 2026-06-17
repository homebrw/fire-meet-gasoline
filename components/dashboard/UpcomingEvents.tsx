"use client"

import { useState } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays } from "lucide-react"
import { EventDetailModal } from "@/components/events/EventDetailModal"
import { useEventsParticipants } from "@/lib/hooks/useEventParticipants"
import { ParticipantBadge } from "@/components/events/ParticipantBadge"

interface UpcomingEventsProps {
  events: CalendarEvent[]
  persons: Person[]
}

export function UpcomingEvents({ events, persons }: UpcomingEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const participants = useEventsParticipants(events.map((e) => e.id))

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
              const eventDate = parseISO(ev.start_at)
              const daysRemaining = differenceInDays(eventDate, new Date())
              const eventParticipants = participants[ev.id] || []

              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full text-left space-y-1 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{ev.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <span>{format(eventDate, "d MMM HH:mm", { locale: fr })}</span>
                    {daysRemaining >= 0 && (
                      <span className="text-[var(--color-muted-foreground)]">
                        {daysRemaining === 0 ? "aujourd'hui" : `dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                  {ev.location && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">📍 {ev.location}</p>
                  )}
                  {eventParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {eventParticipants.map((p) => (
                        <ParticipantBadge
                          key={p.person_id}
                          name={p.persons?.name ?? ""}
                          color={p.persons?.color ?? ""}
                          size="sm"
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </ul>
        )}
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            persons={persons}
            open={!!selectedEvent}
            onOpenChange={(open) => {
              if (!open) setSelectedEvent(null)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
