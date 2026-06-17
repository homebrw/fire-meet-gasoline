"use client"

import { useState } from "react"
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
import { useEventsParticipants } from "@/lib/hooks/useEventParticipants"
import { ParticipantBadge } from "@/components/events/ParticipantBadge"

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
  const participants = useEventsParticipants(events.map((e) => e.id))
  const date = parseISO(dateKey + "T12:00:00")

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
                            {participants[event.id].map((p) => (
                              <ParticipantBadge
                                key={p.person_id}
                                name={p.persons?.name ?? ""}
                                color={p.persons?.color ?? ""}
                              />
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
