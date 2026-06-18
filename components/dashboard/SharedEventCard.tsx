import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { EventCard } from "@/components/events/EventCard"

interface SharedEventCardProps {
  event: CalendarEvent
  persons: Person[]
}

export function SharedEventCard({ event, persons }: SharedEventCardProps) {
  return (
    <Card className="border-[var(--color-event-badge-text)]/30 bg-[var(--color-event-light)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--color-event-badge-text)]" />
          Événement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EventCard event={event} persons={persons} />
      </CardContent>
    </Card>
  )
}
