"use client"

import { CalendarEvent } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { EventAttachmentsList } from "./EventAttachmentsList"
import { deleteAttachment } from "@/lib/actions/events"
import { useEventParticipants } from "@/lib/hooks/useEventParticipants"
import { ParticipantBadge } from "@/components/events/ParticipantBadge"

interface EventDetailCardProps {
  event: CalendarEvent
  showAttachments?: boolean
  showParticipants?: boolean
  canDeleteAttachments?: boolean
}

export function EventDetailCard({
  event,
  showAttachments = true,
  showParticipants = true,
  canDeleteAttachments = false,
}: EventDetailCardProps) {
  const participants = useEventParticipants(event.id, showParticipants)

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-50">
          {event.title}
        </p>
        {event.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {event.description}
          </p>
        )}
      </div>

      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <p className="font-medium">
          {format(parseISO(event.start_at), "EEEE d MMMM yyyy", { locale: fr })}
          {event.is_all_day ? (
            " — Journée entière"
          ) : (
            <>
              {" — "}
              {format(parseISO(event.start_at), "HH:mm", { locale: fr })} –{" "}
              {format(parseISO(event.end_at), "HH:mm", { locale: fr })}
            </>
          )}
        </p>
        {(() => {
          const eventDate = parseISO(event.start_at)
          const daysRemaining = differenceInDays(eventDate, new Date())
          if (daysRemaining >= 0) {
            return (
              <p className="text-gray-500 dark:text-gray-500">
                {daysRemaining === 0 ? "Aujourd'hui" : `Dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`}
              </p>
            )
          }
          return null
        })()}
        {event.location && <p>📍 {event.location}</p>}
      </div>

      {showParticipants && participants.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Participants
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <ParticipantBadge
                key={p.person_id}
                name={p.persons?.name ?? ""}
                color={p.persons?.color ?? ""}
              />
            ))}
          </div>
        </div>
      )}

      {showAttachments && (
        <div className="pt-2 border-t">
          <EventAttachmentsList
            eventId={event.id}
            canDelete={canDeleteAttachments}
            onDelete={(attachmentId, storagePath) =>
              deleteAttachment(attachmentId, storagePath)
            }
          />
        </div>
      )}
    </Card>
  )
}
