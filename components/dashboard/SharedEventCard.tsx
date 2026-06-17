"use client"

import { useState } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Calendar, Trash2 } from "lucide-react"
import { EventCard } from "@/components/events/EventCard"
import { deleteEvent } from "@/lib/actions/events"

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
            Événement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EventCard event={event} persons={persons} />

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
