"use client"

import { useState } from "react"
import { CalendarEvent, Person } from "@/lib/types"
import { format, parseISO, differenceInDays, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { Paperclip, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventAttachmentsList } from "./EventAttachmentsList"
import { EventForm } from "./EventForm"
import { ParticipantBadge } from "./ParticipantBadge"
import { useEventParticipants } from "@/lib/hooks/useEventParticipants"
import { useEventAttachments } from "@/lib/hooks/useEventAttachments"
import { deleteAttachment } from "@/lib/actions/events"

interface EventCardProps {
  event: CalendarEvent
  persons: Person[]
  canDeleteAttachments?: boolean
  onSuccess?: () => void
  onRevalidateNeeded?: () => Promise<void>
}

export function EventCard({
  event,
  persons,
  canDeleteAttachments = false,
  onSuccess,
  onRevalidateNeeded,
}: EventCardProps) {
  const [showAttachments, setShowAttachments] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const participants = useEventParticipants(event.id)
  const { attachments, refetch: refetchAttachments } = useEventAttachments(event.id)

  const eventDate = parseISO(event.start_at)
  const endDate = parseISO(event.end_at)
  const daysRemaining = differenceInDays(eventDate, new Date())
  const isMultiDay = !isSameDay(eventDate, endDate)

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-[var(--color-foreground)]">{event.title}</p>
        {event.description && (
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{event.description}</p>
        )}
      </div>

      <div className="space-y-1 text-xs text-[var(--color-muted-foreground)]">
        <p className="font-medium">
          {format(eventDate, "EEEE d MMMM yyyy", { locale: fr })}
          {event.is_all_day ? (
            " — Journée entière"
          ) : (
            <>
              {" — "}
              {format(eventDate, "HH:mm", { locale: fr })} –{" "}
              {isMultiDay && `${format(endDate, "EEEE d MMMM yyyy", { locale: fr })} `}
              {format(endDate, "HH:mm", { locale: fr })}
            </>
          )}
        </p>
        {daysRemaining >= 0 && (
          <p className="text-[var(--color-muted-foreground)]">
            {daysRemaining === 0 ? "Aujourd'hui" : `Dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`}
          </p>
        )}
        {event.location && <p>📍 {event.location}</p>}
      </div>

      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <ParticipantBadge key={p.person_id} name={p.persons?.name ?? ""} color={p.persons?.color ?? ""} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {attachments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAttachments(true)}
            className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <Paperclip className="h-3.5 w-3.5" />
            {attachments.length}
          </button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Button>
      </div>

      <Dialog open={showAttachments} onOpenChange={setShowAttachments}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pièces jointes</DialogTitle>
          </DialogHeader>
          <EventAttachmentsList
            attachments={attachments}
            canDelete={canDeleteAttachments}
            onDelete={async (attachmentId, storagePath) => {
              await deleteAttachment(attachmentId, storagePath)
              await refetchAttachments()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;événement</DialogTitle>
          </DialogHeader>
          <EventForm
            persons={persons}
            event={event}
            onSuccess={() => {
              setIsEditing(false)
              onSuccess?.()
            }}
            onRevalidateNeeded={onRevalidateNeeded}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
