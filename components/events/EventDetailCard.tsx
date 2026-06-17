"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CalendarEvent } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { EventAttachmentsList } from "./EventAttachmentsList"
import { deleteAttachment } from "@/lib/actions/events"

type ParticipantData = {
  person_id: string
  persons?: Array<{
    name: string
    color: string
  }>
}

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
  const [participants, setParticipants] = useState<ParticipantData[]>([])

  useEffect(() => {
    if (!showParticipants) return

    async function loadParticipants() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("event_participants")
          .select("person_id, persons(name, color)")
          .eq("event_id", event.id)

        if (data) {
          setParticipants(data)
        }
      } catch (error) {
        console.error("Error loading participants:", error)
      }
    }

    loadParticipants()
  }, [event.id, showParticipants])

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
        <p>
          {format(parseISO(event.start_at), "HH:mm", { locale: fr })} –{" "}
          {format(parseISO(event.end_at), "HH:mm", { locale: fr })}
        </p>
        {event.location && <p>📍 {event.location}</p>}
      </div>

      {showParticipants && participants.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Participants
          </p>
          <div className="flex flex-wrap gap-1">
            {participants.map((p) => (
              <div
                key={p.person_id}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: p.persons?.[0]?.color || "#6b7280" }}
                />
                <span>{p.persons?.[0]?.name || "?"}</span>
              </div>
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
