"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { EventParticipantWithPerson } from "@/lib/types"

async function fetchParticipants(eventId: string): Promise<EventParticipantWithPerson[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("event_participants")
    .select("person_id, persons(name, color)")
    .eq("event_id", eventId)

  return (data ?? []) as unknown as EventParticipantWithPerson[]
}

export function useEventParticipants(eventId: string, enabled = true) {
  const [participants, setParticipants] = useState<EventParticipantWithPerson[]>([])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    fetchParticipants(eventId).then((data) => {
      if (!cancelled) setParticipants(data)
    })

    return () => {
      cancelled = true
    }
  }, [eventId, enabled])

  return participants
}

export function useEventsParticipants(eventIds: string[]) {
  const [participantsByEvent, setParticipantsByEvent] = useState<
    Record<string, EventParticipantWithPerson[]>
  >({})

  const key = eventIds.join(",")

  useEffect(() => {
    if (eventIds.length === 0) return

    let cancelled = false

    Promise.all(eventIds.map((id) => fetchParticipants(id))).then((results) => {
      if (cancelled) return
      const map: Record<string, EventParticipantWithPerson[]> = {}
      eventIds.forEach((id, i) => {
        map[id] = results[i]
      })
      setParticipantsByEvent(map)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return participantsByEvent
}
