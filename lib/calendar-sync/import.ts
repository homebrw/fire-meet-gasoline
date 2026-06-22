import { createClient } from "@/lib/supabase/server"
import { getValidGoogleAccessToken } from "@/lib/calendar-sync/connection"
import { listGoogleEvents, type GoogleCalendarListEvent } from "@/lib/google-calendar"

// Same rolling window as the push sync: a few days back, far enough ahead
// to cover the planning horizon.
const WINDOW_DAYS_PAST = 3
const WINDOW_DAYS_FUTURE = 120

function windowBounds() {
  const now = new Date()
  const from = new Date(now.getTime() - WINDOW_DAYS_PAST * 24 * 60 * 60 * 1000)
  const to = new Date(now.getTime() + WINDOW_DAYS_FUTURE * 24 * 60 * 60 * 1000)
  return { from, to }
}

function eventTimes(e: GoogleCalendarListEvent): { startAt: string; endAt: string; isAllDay: boolean } {
  if (e.start.dateTime && e.end.dateTime) {
    return { startAt: e.start.dateTime, endAt: e.end.dateTime, isAllDay: false }
  }
  // All-day events use plain "date" strings instead of "dateTime".
  return {
    startAt: new Date(`${e.start.date}T00:00:00`).toISOString(),
    endAt: new Date(`${e.end.date}T00:00:00`).toISOString(),
    isAllDay: true,
  }
}

// Pulls events from the person's Google calendar and stores them as review
// candidates. Events we pushed ourselves (tracked in calendar_sync_links)
// are excluded so a round-trip through Google can't re-import our own data.
export async function fetchGoogleImportCandidates(personId: string): Promise<void> {
  const connection = await getValidGoogleAccessToken(personId)
  if (!connection) return

  const supabase = await createClient()
  const { from, to } = windowBounds()

  const [googleEvents, linksRes] = await Promise.all([
    listGoogleEvents(connection.access_token, connection.calendar_id, from.toISOString(), to.toISOString()),
    supabase.from("calendar_sync_links").select("external_event_id").eq("connection_id", connection.id),
  ])

  const ownPushedIds = new Set((linksRes.data ?? []).map((l) => l.external_event_id))
  const candidates = googleEvents.filter((e) => !ownPushedIds.has(e.id))

  for (const e of candidates) {
    const { startAt, endAt, isAllDay } = eventTimes(e)
    const { error } = await supabase.from("calendar_import_candidates").upsert(
      {
        connection_id: connection.id,
        external_event_id: e.id,
        summary: e.summary ?? "(Sans titre)",
        description: e.description ?? null,
        location: e.location ?? null,
        start_at: startAt,
        end_at: endAt,
        is_all_day: isAllDay,
      },
      { onConflict: "connection_id,external_event_id" }
    )
    if (error) throw new Error(error.message)
  }
}
