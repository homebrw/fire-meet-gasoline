import { randomUUID, randomBytes } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { getValidGoogleAccessToken } from "@/lib/calendar-sync/connection"
import { watchGoogleEvents, stopGoogleChannel } from "@/lib/google-calendar"
import type { SupabaseClient } from "@supabase/supabase-js"

// Google caps calendar watch channels at 7 days; renew a bit early.
const TTL_SECONDS = 6 * 24 * 60 * 60

function webhookAddress(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL")
  return `${baseUrl}/api/calendar/google/webhook`
}

// Registers (or re-registers) a Google Calendar push-notification channel for
// this person's connection, so new/changed events trigger our webhook instead
// of relying solely on manual refresh. Stops the previous channel first, if
// any, since Google only allows one active watch per channel id.
export async function registerCalendarWatch(personId: string, client?: SupabaseClient): Promise<void> {
  const connection = await getValidGoogleAccessToken(personId, client)
  if (!connection) return

  const supabase = client ?? (await createClient())
  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("google_channel_id, google_resource_id")
    .eq("id", connection.id)
    .single()

  if (existing?.google_channel_id && existing.google_resource_id) {
    await stopGoogleChannel(connection.access_token, existing.google_channel_id, existing.google_resource_id).catch(
      () => {}
    )
  }

  const channelId = randomUUID()
  const channelToken = randomBytes(32).toString("hex")

  const { resourceId, expiration } = await watchGoogleEvents(
    connection.access_token,
    connection.calendar_id,
    channelId,
    webhookAddress(),
    channelToken,
    TTL_SECONDS
  )

  const { error } = await supabase
    .from("calendar_connections")
    .update({
      google_channel_id: channelId,
      google_resource_id: resourceId,
      google_channel_token: channelToken,
      channel_expires_at: new Date(Number(expiration)).toISOString(),
    })
    .eq("id", connection.id)
  if (error) throw new Error(error.message)
}

// Best-effort: called on disconnect to tell Google to stop sending pushes.
// Failures are swallowed since the connection row is about to be deleted
// anyway and a stale channel will simply expire on its own.
export async function unregisterCalendarWatch(personId: string, client?: SupabaseClient): Promise<void> {
  const connection = await getValidGoogleAccessToken(personId, client)
  if (!connection) return

  const supabase = client ?? (await createClient())
  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("google_channel_id, google_resource_id")
    .eq("id", connection.id)
    .single()

  if (existing?.google_channel_id && existing.google_resource_id) {
    await stopGoogleChannel(connection.access_token, existing.google_channel_id, existing.google_resource_id).catch(
      () => {}
    )
  }
}
