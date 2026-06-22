import { createClient } from "@/lib/supabase/server"
import { APP_TIMEZONE } from "@/lib/timezone"
import { getValidGoogleAccessToken } from "@/lib/calendar-sync/connection"
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  type GoogleCalendarEventInput,
} from "@/lib/google-calendar"

// Rolling window: a few days back (catch late edits to recent periods) and
// far enough ahead to cover the planning horizon shown in /calendar.
const WINDOW_DAYS_PAST = 3
const WINDOW_DAYS_FUTURE = 120

type SourceTable = "child_presences" | "custody_transitions" | "events"

type SyncItem = {
  sourceTable: SourceTable
  sourceId: string
  event: GoogleCalendarEventInput
}

const TRANSITION_DURATION_MS = 30 * 60 * 1000

function windowBounds() {
  const now = new Date()
  const from = new Date(now.getTime() - WINDOW_DAYS_PAST * 24 * 60 * 60 * 1000)
  const to = new Date(now.getTime() + WINDOW_DAYS_FUTURE * 24 * 60 * 60 * 1000)
  return { from, to }
}

export async function syncPersonCalendarToGoogle(personId: string): Promise<void> {
  const connection = await getValidGoogleAccessToken(personId)
  if (!connection) return

  const supabase = await createClient()
  const { from, to } = windowBounds()
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  const [presencesRes, transitionsRes, eventsRes, linksRes] = await Promise.all([
    supabase
      .from("child_presences")
      .select("id, start_at, end_at")
      .eq("person_id", personId)
      .gte("start_at", fromIso)
      .lte("start_at", toIso),
    supabase
      .from("custody_transitions")
      .select("id, transition_at, direction, location")
      .eq("person_id", personId)
      .gte("transition_at", fromIso)
      .lte("transition_at", toIso),
    supabase
      .from("events")
      .select("id, title, description, start_at, end_at, location, owner_person_id")
      .or(`owner_person_id.eq.${personId},owner_person_id.is.null`)
      .is("imported_from_connection_id", null)
      .gte("start_at", fromIso)
      .lte("start_at", toIso),
    supabase
      .from("calendar_sync_links")
      .select("id, source_table, source_id, external_event_id")
      .eq("connection_id", connection.id),
  ])

  if (presencesRes.error) throw new Error(presencesRes.error.message)
  if (transitionsRes.error) throw new Error(transitionsRes.error.message)
  if (eventsRes.error) throw new Error(eventsRes.error.message)
  if (linksRes.error) throw new Error(linksRes.error.message)

  const items: SyncItem[] = [
    ...(presencesRes.data ?? []).map((p) => ({
      sourceTable: "child_presences" as const,
      sourceId: p.id,
      event: {
        summary: "Garde des enfants",
        start: { dateTime: p.start_at, timeZone: APP_TIMEZONE },
        end: { dateTime: p.end_at, timeZone: APP_TIMEZONE },
      },
    })),
    ...(transitionsRes.data ?? []).map((t) => ({
      sourceTable: "custody_transitions" as const,
      sourceId: t.id,
      event: {
        summary: t.direction === "pickup" ? "Récupération des enfants" : "Dépose des enfants",
        location: t.location ?? undefined,
        start: { dateTime: t.transition_at, timeZone: APP_TIMEZONE },
        end: {
          dateTime: new Date(new Date(t.transition_at).getTime() + TRANSITION_DURATION_MS).toISOString(),
          timeZone: APP_TIMEZONE,
        },
      },
    })),
    ...(eventsRes.data ?? []).map((e) => ({
      sourceTable: "events" as const,
      sourceId: e.id,
      event: {
        summary: e.title,
        description: e.description ?? undefined,
        location: e.location ?? undefined,
        start: { dateTime: e.start_at, timeZone: APP_TIMEZONE },
        end: { dateTime: e.end_at, timeZone: APP_TIMEZONE },
      },
    })),
  ]

  const links = linksRes.data ?? []
  const linkByKey = new Map(links.map((l) => [`${l.source_table}:${l.source_id}`, l]))
  const seenKeys = new Set<string>()

  for (const item of items) {
    const key = `${item.sourceTable}:${item.sourceId}`
    seenKeys.add(key)
    const existingLink = linkByKey.get(key)

    if (existingLink) {
      await updateGoogleEvent(connection.access_token, connection.calendar_id, existingLink.external_event_id, item.event)
      await supabase
        .from("calendar_sync_links")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingLink.id)
    } else {
      const created = await createGoogleEvent(connection.access_token, connection.calendar_id, item.event)
      await supabase.from("calendar_sync_links").insert({
        connection_id: connection.id,
        source_table: item.sourceTable,
        source_id: item.sourceId,
        external_event_id: created.id,
      })
    }
  }

  // Clean up links whose source item disappeared from the current window
  // (deleted locally, or simply aged out of the rolling window).
  const staleLinks = links.filter((l) => !seenKeys.has(`${l.source_table}:${l.source_id}`))
  for (const link of staleLinks) {
    await deleteGoogleEvent(connection.access_token, connection.calendar_id, link.external_event_id)
    await supabase.from("calendar_sync_links").delete().eq("id", link.id)
  }

  await supabase
    .from("calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id)
}

export async function syncPersonCalendarSafe(personId: string): Promise<void> {
  try {
    await syncPersonCalendarToGoogle(personId)
  } catch (err) {
    console.error(`[calendar-sync] failed to sync person ${personId}:`, err)
  }
}
