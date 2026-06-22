import { createAdminClient } from "@/lib/supabase/admin"
import { registerCalendarWatch } from "@/lib/calendar-sync/watch"
import { NextResponse } from "next/server"

// Google watch channels expire after at most 7 days; this renews any channel
// expiring within the next day so push notifications never silently lapse
// into "manual refresh only" mode.
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() + RENEW_BEFORE_MS).toISOString()

  const { data: connections, error } = await supabase
    .from("calendar_connections")
    .select("person_id")
    .eq("provider", "google")
    .or(`channel_expires_at.is.null,channel_expires_at.lt.${cutoff}`)
  if (error) throw new Error(error.message)

  const results = await Promise.allSettled(
    (connections ?? []).map((c) => registerCalendarWatch(c.person_id, supabase))
  )
  const failed = results.filter((r) => r.status === "rejected").length

  return NextResponse.json({ renewed: results.length - failed, failed })
}
