"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays } from "lucide-react"
import { EventDetailModal } from "@/components/events/EventDetailModal"

type ParticipantData = {
  person_id: string
  persons?: Array<{
    name: string
    color: string
  }>
}

interface UpcomingEventsProps {
  events: CalendarEvent[]
  persons: Person[]
}

export function UpcomingEvents({ events, persons }: UpcomingEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [participants, setParticipants] = useState<Record<string, ParticipantData[]>>({})

  useEffect(() => {
    async function loadParticipants() {
      const supabase = createClient()
      const participantsMap: Record<string, ParticipantData[]> = {}
      for (const event of events) {
        const { data: parts } = await supabase
          .from("event_participants")
          .select("person_id, persons(name, color)")
          .eq("event_id", event.id)
        participantsMap[event.id] = parts || []
      }
      setParticipants(participantsMap)
    }
    if (events.length > 0) {
      loadParticipants()
    }
  }, [events])

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
                    {ev.is_blocking && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Bloquant</span>
                    )}
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
                    <div className="flex flex-wrap gap-1 pt-1">
                      {eventParticipants.map((p) => (
                        <div
                          key={p.person_id}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.persons?.[0]?.color || "#6b7280" }}
                          />
                          <span className="text-gray-700 dark:text-gray-300">{p.persons?.[0]?.name || "?"}</span>
                        </div>
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
