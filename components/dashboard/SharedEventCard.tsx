"use client"

import { useState } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar, Trash2 } from "lucide-react"
import { EventAttachmentsList } from "@/components/events/EventAttachmentsList"
import { deleteEvent, deleteAttachment } from "@/lib/actions/events"

interface SharedEventCardProps {
  event: CalendarEvent
  persons: Person[]
}

export function SharedEventCard({ event, persons }: SharedEventCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

          <EventAttachmentsList eventId={event.id} />

          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="destructive"
            size="sm"
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer l&apos;événement
          </Button>
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
