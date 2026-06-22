"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { syncPersonCalendarToGoogle } from "@/lib/calendar-sync/sync"
import { getGoogleBusyPeriods } from "@/lib/calendar-sync/freebusy"
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
