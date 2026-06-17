"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { EventAttachment } from "@/lib/types"

export function useEventAttachments(eventId: string) {
  const [attachments, setAttachments] = useState<EventAttachment[]>([])

  const fetchAttachments = useCallback(async (): Promise<EventAttachment[]> => {
    const supabase = createClient()
    const { data } = await supabase
      .from("event_attachments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })

    return (data ?? []) as EventAttachment[]
  }, [eventId])

  const refetch = useCallback(async () => {
    const data = await fetchAttachments()
    setAttachments(data)
  }, [fetchAttachments])

  useEffect(() => {
    let cancelled = false
    fetchAttachments().then((data) => {
      if (!cancelled) setAttachments(data)
    })
    return () => {
      cancelled = true
    }
  }, [fetchAttachments])

  return { attachments, refetch }
}
