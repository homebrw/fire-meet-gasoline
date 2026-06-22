import { createAdminClient } from "@/lib/supabase/admin"
import { fetchGoogleImportCandidates } from "@/lib/calendar-sync/import"
import { NextResponse } from "next/server"

// Google sends an empty body with the actual state encoded in headers — never
// parse the body. `sync` resource states are the initial handshake and carry
// no real change; only react to real notifications.
//
// There's no Supabase Auth session in a webhook call, so an admin (service
// role) client is required here — the owner-only RLS policies on
// calendar_connections would otherwise hide every row.
export async function POST(request: Request) {
  const channelId = request.headers.get("X-Goog-Channel-ID")
  const resourceState = request.headers.get("X-Goog-Resource-State")
  const channelToken = request.headers.get("X-Goog-Channel-Token")

  if (!channelId || !channelToken) {
    return NextResponse.json({ error: "Missing channel headers" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("person_id, google_channel_token")
    .eq("google_channel_id", channelId)
    .maybeSingle()

  if (error || !connection || connection.google_channel_token !== channelToken) {
    return NextResponse.json({ error: "Unknown or invalid channel" }, { status: 404 })
  }

  if (resourceState === "sync") {
    return NextResponse.json({ ok: true })
  }

  await fetchGoogleImportCandidates(connection.person_id, supabase)
  return NextResponse.json({ ok: true })
}
