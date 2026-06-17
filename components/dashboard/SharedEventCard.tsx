"use client"

import { useState } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar } from "lucide-react"
import { EventDetailModal } from "@/components/events/EventDetailModal"

interface SharedEventCardProps {
  event: CalendarEvent
  persons: Person[]
}

export function SharedEventCard({ event, persons }: SharedEventCardProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Événement commun
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">{event.title}</p>
            {event.description && (
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {format(parseISO(event.start_at), "EEEE d MMMM à HH:mm", { locale: fr })}
            </p>
            {event.location && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                📍 {event.location}
              </p>
            )}
          </div>

          {event.is_blocking && (
            <Badge variant="destructive" className="text-xs w-fit">
              Bloquant
            </Badge>
          )}

          <Button
            onClick={() => setShowModal(true)}
            variant="outline"
            className="w-full"
          >
            Voir les détails
          </Button>
        </CardContent>
      </Card>

      {showModal && (
        <EventDetailModal
          event={event}
          persons={persons}
          open={showModal}
          onOpenChange={setShowModal}
        />
      )}
    </>
  )
}
