"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar } from "lucide-react"
import { EventDetailModal } from "@/components/events/EventDetailModal"

type ParticipantData = {
  person_id: string
  persons?: Array<{
    name: string
    color: string
  }>
}

interface SharedEventCardProps {
  event: CalendarEvent
  persons: Person[]
}

export function SharedEventCard({ event, persons }: SharedEventCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [participants, setParticipants] = useState<ParticipantData[]>([])

  useEffect(() => {
    async function loadParticipants() {
      const supabase = createClient()
      const { data: parts } = await supabase
        .from("event_participants")
        .select("person_id, persons(name, color)")
        .eq("event_id", event.id)
      if (parts) {
        setParticipants(parts)
      }
    }
    loadParticipants()
  }, [event.id])

  const eventDate = parseISO(event.start_at)
  const daysRemaining = differenceInDays(eventDate, new Date())

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Événement
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
              {format(eventDate, "d MMMM HH:mm", { locale: fr })}
              {daysRemaining >= 0 && (
                <span className="ml-2">
                  {daysRemaining === 0 ? "aujourd'hui" : `dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`}
                </span>
              )}
            </p>
            {event.location && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                📍 {event.location}
              </p>
            )}
          </div>

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {participants.map((p) => (
                <div
                  key={p.person_id}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-white dark:bg-blue-900/40"
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
