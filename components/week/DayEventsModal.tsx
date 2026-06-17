"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { CalendarEvent, Person } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EventDetailModal } from "@/components/events/EventDetailModal"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type EventParticipantData = {
  person_id: string
  persons?: {
    name: string
    color: string
  }
}

interface DayEventsModalProps {
  dateKey: string
  events: CalendarEvent[]
  persons: Person[]
  open: boolean
  onClose: () => void
}

export function DayEventsModal({
  dateKey,
  events,
  persons,
  open,
  onClose,
}: DayEventsModalProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [participants, setParticipants] = useState<Record<string, EventParticipantData[]>>({})
  const date = parseISO(dateKey + "T12:00:00")

  useEffect(() => {
    async function loadParticipants() {
      const supabase = createClient()
      const participantsMap: Record<string, EventParticipantData[]> = {}

      for (const event of events) {
        const { data: parts } = await supabase
          .from("event_participants")
          .select("person_id, persons(name, color)")
          .eq("event_id", event.id)
        participantsMap[event.id] = (parts || []) as unknown as EventParticipantData[]
      }

      setParticipants(participantsMap)
    }

    if (events.length > 0) {
      loadParticipants()
    }
  }, [events])

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <div>
              <SheetTitle className="capitalize">
                {format(date, "EEEE d MMMM yyyy", { locale: fr })}
              </SheetTitle>
            </div>
          </SheetHeader>

          {events.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold">{events.length} événement{events.length > 1 ? "s" : ""}</p>
              <ul className="space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 text-left"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs text-[var(--color-muted-foreground)] mt-1">
                          {event.is_all_day ? (
                            "Journée entière"
                          ) : (
                            <>
                              {format(parseISO(event.start_at), "HH:mm", { locale: fr })} –{" "}
                              {format(parseISO(event.end_at), "HH:mm", { locale: fr })}
                            </>
                          )}
                          {event.location && <div>📍 {event.location}</div>}
                        </div>
                        {participants[event.id] && participants[event.id].length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {participants[event.id].map((p: EventParticipantData) => (
                              <div key={p.person_id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: p.persons?.color || "#6b7280" }}
                                />
                                <span>{p.persons?.name || "?"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Aucun événement ce jour
            </div>
          )}
        </SheetContent>
      </Sheet>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          persons={persons}
          open={!!selectedEvent}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedEvent(null)
              location.reload()
            }
          }}
        />
      )}
    </>
  )
}
