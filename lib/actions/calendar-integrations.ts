"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { syncPersonCalendarToGoogle } from "@/lib/calendar-sync/sync"
import { getGoogleBusyPeriods } from "@/lib/calendar-sync/freebusy"
import { fetchGoogleImportCandidates } from "@/lib/calendar-sync/import"
import { unregisterCalendarWatch } from "@/lib/calendar-sync/watch"
import type { BusyPeriod } from "@/lib/google-calendar"

async function getCurrentPersonId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: person, error } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  if (error || !person) throw new Error("Person not found for current user")
  return person.id
}

export type GoogleCalendarConnectionStatus = {
  connected: boolean
  googleAccountEmail: string | null
  lastSyncedAt: string | null
}

export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnectionStatus> {
  const personId = await getCurrentPersonId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("google_account_email, last_synced_at")
    .eq("person_id", personId)
    .eq("provider", "google")
    .maybeSingle()
  if (error) throw new Error(error.message)

  return {
    connected: !!data,
    googleAccountEmail: data?.google_account_email ?? null,
    lastSyncedAt: data?.last_synced_at ?? null,
  }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const personId = await getCurrentPersonId()
  await unregisterCalendarWatch(personId).catch(() => {})
  const supabase = await createClient()
  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("person_id", personId)
    .eq("provider", "google")
  if (error) throw new Error(error.message)
  revalidatePath("/settings/integrations")
}

export async function syncGoogleCalendarNow(): Promise<void> {
  const personId = await getCurrentPersonId()
  await syncPersonCalendarToGoogle(personId)
  revalidatePath("/settings/integrations")
}

export async function getUpcomingGoogleBusyPeriods(): Promise<BusyPeriod[]> {
  const personId = await getCurrentPersonId()
  const from = new Date()
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000)
  return getGoogleBusyPeriods(personId, from, to)
}

export type GoogleImportCandidate = {
  id: string
  summary: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
}

export async function refreshGoogleImportCandidates(): Promise<void> {
  const personId = await getCurrentPersonId()
  await fetchGoogleImportCandidates(personId)
  revalidatePath("/settings/integrations/import")
}

// Defensive: used to render a nav badge, so a transient failure (no person,
// not connected, etc.) should just hide the badge rather than break the page.
export async function getPendingGoogleImportCount(): Promise<number> {
  try {
    const personId = await getCurrentPersonId()
    const supabase = await createClient()

    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("person_id", personId)
      .eq("provider", "google")
      .maybeSingle()
    if (!connection) return 0

    const { count, error } = await supabase
      .from("calendar_import_candidates")
      .select("id", { count: "exact", head: true })
      .eq("connection_id", connection.id)
      .eq("status", "pending")
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export async function getPendingGoogleImportCandidates(): Promise<GoogleImportCandidate[]> {
  const personId = await getCurrentPersonId()
  const supabase = await createClient()

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("person_id", personId)
    .eq("provider", "google")
    .maybeSingle()
  if (!connection) return []

  const { data, error } = await supabase
    .from("calendar_import_candidates")
    .select("id, summary, description, location, start_at, end_at, is_all_day")
    .eq("connection_id", connection.id)
    .eq("status", "pending")
    .order("start_at")
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function acceptGoogleImportCandidate(candidateId: string): Promise<void> {
  const personId = await getCurrentPersonId()
  const supabase = await createClient()

  const { data: candidate, error } = await supabase
    .from("calendar_import_candidates")
    .select("connection_id, external_event_id, summary, description, location, start_at, end_at, is_all_day")
    .eq("id", candidateId)
    .single()
  if (error || !candidate) throw new Error("Import candidate not found")

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert({
      title: candidate.summary,
      description: candidate.description,
      location: candidate.location,
      start_at: candidate.start_at,
      end_at: candidate.end_at,
      is_all_day: candidate.is_all_day,
      owner_person_id: personId,
      created_by: personId,
      imported_from_connection_id: candidate.connection_id,
      external_event_id: candidate.external_event_id,
    })
    .select("id")
    .single()
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from("calendar_import_candidates")
    .update({ status: "accepted", created_event_id: inserted.id })
    .eq("id", candidateId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath("/settings/integrations/import")
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function rejectGoogleImportCandidate(candidateId: string): Promise<void> {
  await getCurrentPersonId()
  const supabase = await createClient()

  const { error } = await supabase
    .from("calendar_import_candidates")
    .update({ status: "rejected" })
    .eq("id", candidateId)
  if (error) throw new Error(error.message)

  revalidatePath("/settings/integrations/import")
}

export async function getRejectedGoogleImportCandidates(): Promise<GoogleImportCandidate[]> {
  const personId = await getCurrentPersonId()
  const supabase = await createClient()

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("person_id", personId)
    .eq("provider", "google")
    .maybeSingle()
  if (!connection) return []

  const { data, error } = await supabase
    .from("calendar_import_candidates")
    .select("id, summary, description, location, start_at, end_at, is_all_day")
    .eq("connection_id", connection.id)
    .eq("status", "rejected")
    .order("start_at")
  if (error) throw new Error(error.message)
  return data ?? []
}

// Brings a rejected candidate back into the pending queue, in case the
// user changes their mind — rejecting was never meant to be permanent.
export async function restoreGoogleImportCandidate(candidateId: string): Promise<void> {
  await getCurrentPersonId()
  const supabase = await createClient()

  const { error } = await supabase
    .from("calendar_import_candidates")
    .update({ status: "pending" })
    .eq("id", candidateId)
  if (error) throw new Error(error.message)

  revalidatePath("/settings/integrations/import")
}

export async function getAcceptedGoogleImportCandidates(): Promise<GoogleImportCandidate[]> {
  const personId = await getCurrentPersonId()
  const supabase = await createClient()

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("person_id", personId)
    .eq("provider", "google")
    .maybeSingle()
  if (!connection) return []

  const { data, error } = await supabase
    .from("calendar_import_candidates")
    .select("id, summary, description, location, start_at, end_at, is_all_day")
    .eq("connection_id", connection.id)
    .eq("status", "accepted")
    .order("start_at")
  if (error) throw new Error(error.message)
  return data ?? []
}

// Un-importing deletes the event it created — the schema only tracks
// pending/accepted/rejected, so there's no "imported but hidden" state to
// fall back to. The candidate goes back to "rejected" so it can be
// re-accepted later without re-fetching it from Google.
export async function revokeGoogleImportCandidate(candidateId: string): Promise<void> {
  await getCurrentPersonId()
  const supabase = await createClient()

  const { data: candidate, error } = await supabase
    .from("calendar_import_candidates")
    .select("created_event_id")
    .eq("id", candidateId)
    .single()
  if (error || !candidate) throw new Error("Import candidate not found")

  if (candidate.created_event_id) {
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", candidate.created_event_id)
    if (deleteError) throw new Error(deleteError.message)
  }

  const { error: updateError } = await supabase
    .from("calendar_import_candidates")
    .update({ status: "rejected", created_event_id: null })
    .eq("id", candidateId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath("/settings/integrations/import")
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}
