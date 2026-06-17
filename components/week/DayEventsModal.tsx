"use client"

import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { CalendarEvent, Person } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EventCard } from "@/components/events/EventCard"

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
  const date = parseISO(dateKey + "T12:00:00")

  return (
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
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-lg border p-3">
                  <EventCard
                    event={event}
                    persons={persons}
                    onRevalidateNeeded={async () => location.reload()}
                  />
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
  )
}
