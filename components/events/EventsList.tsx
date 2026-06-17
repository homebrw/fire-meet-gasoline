"use client"

import { useTransition } from "react"
import type { CalendarEvent } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { ContentCard } from "@/components/state"
import { deleteEvent } from "@/lib/actions/events"

interface EventsListProps {
  events: CalendarEvent[]
  persons: Person[]
  participants: Record<string, Array<{ person_id: string; persons?: Array<{ name: string; color: string }> }>>
  isLoading?: boolean
  error?: { title: string; description: string; onRetry?: () => void }
  onEdit?: (event: CalendarEvent) => void
  onAdd?: () => void
}

export function EventsList({
  events,
  persons,
  participants,
  isLoading,
  error,
  onEdit,
  onAdd,
}: EventsListProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteEvent(id)
      location.reload()
    })
  }

  return (
    <ContentCard
      title="Événements Partagés"
      isEmpty={events.length === 0}
      isLoading={isLoading}
      error={error}
      emptyState={{
        title: "Aucun événement partagé",
        description: "Créez votre premier événement pour le partager avec la famille",
        action: onAdd ? { label: "Créer un événement", onClick: onAdd } : undefined,
      }}
    >
      <div className="space-y-3">
        {events.map((event) => {
          const eventParticipants = participants[event.id] || []
          const startDate = parseISO(event.start_at)

          return (
            <Card key={event.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex-1">{event.title}</div>
                  <div className="flex gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(event)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[var(--color-destructive)]"
                      disabled={isPending}
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {format(startDate, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.visibility === "shared" && (
                    <Badge variant="secondary">Partagé</Badge>
                  )}
                  {eventParticipants.length > 0 && (
                    <Badge variant="outline">
                      {eventParticipants.length} participant{eventParticipants.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ContentCard>
  )
}
