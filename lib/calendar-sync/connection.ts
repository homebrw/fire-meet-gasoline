import { createClient } from "@/lib/supabase/server"
import { refreshAccessToken } from "@/lib/google-calendar"
import type { SupabaseClient } from "@supabase/supabase-js"

export type CalendarConnection = {
  id: string
  person_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  calendar_id: string
}

// Refresh ~5 minutes before actual expiry to avoid racing token expiration
// mid-sync.
const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000

// `client` is optional and only needed for contexts with no Supabase Auth
// session (webhook receiver, cron) — pass an admin client there since the
// owner-only RLS policy on calendar_connections would otherwise hide the row.
export async function getConnectionByPersonId(
  personId: string,
  client?: SupabaseClient
): Promise<CalendarConnection | null> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, person_id, access_token, refresh_token, token_expires_at, calendar_id")
    .eq("person_id", personId)
    .eq("provider", "google")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getValidGoogleAccessToken(
  personId: string,
  client?: SupabaseClient
): Promise<CalendarConnection | null> {
  const connection = await getConnectionByPersonId(personId, client)
  if (!connection) return null

  const expiresAt = new Date(connection.token_expires_at).getTime()
  if (expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return connection
  }

  const tokens = await refreshAccessToken(connection.refresh_token)
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const supabase = client ?? (await createClient())
  const { error } = await supabase
    .from("calendar_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq("id", connection.id)
  if (error) throw new Error(error.message)

  return { ...connection, access_token: tokens.access_token, token_expires_at: newExpiresAt }
}
