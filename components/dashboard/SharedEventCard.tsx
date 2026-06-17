"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar, Trash2 } from "lucide-react"
import { EventAttachmentsList } from "@/components/events/EventAttachmentsList"
import { deleteEvent } from "@/lib/actions/events"

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
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteEvent(event.id)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error("Error deleting event:", error)
      alert("Erreur lors de la suppression de l'événement")
    } finally {
      setIsDeleting(false)
    }
  }

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

          <EventAttachmentsList eventId={event.id} />

          <div className="flex justify-end pt-2 border-t">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-red-600 dark:hover:text-red-400 transition"
              aria-label="Supprimer l'événement"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer l&apos;événement <strong>{event.title}</strong> ?
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Cette action ne peut pas être annulée.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
