"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { datetimeLocalToUTC } from "@/lib/utils"
import { syncPersonCalendarSafe } from "@/lib/calendar-sync/sync"

const presenceSchema = z.object({
  person_id: z.string().uuid(),
  start_at: z.string(),
  end_at: z.string(),
  recurrence_rule_id: z.string().uuid().nullable().optional(),
  is_exception: z.coerce.boolean().default(false),
  notes: z.string().nullable().optional(),
})

export async function createChildPresence(formData: FormData) {
  const supabase = await createClient()
  const data = presenceSchema.parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.start_at && !data.start_at.includes("Z")) {
    data.start_at = datetimeLocalToUTC(data.start_at)
  }
  if (data.end_at && !data.end_at.includes("Z")) {
    data.end_at = datetimeLocalToUTC(data.end_at)
  }

  const { error } = await supabase.from("child_presences").insert(data)
  if (error) throw new Error(error.message)
  void syncPersonCalendarSafe(data.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateChildPresence(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = presenceSchema.partial().parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.start_at && !data.start_at.includes("Z")) {
    data.start_at = datetimeLocalToUTC(data.start_at)
  }
  if (data.end_at && !data.end_at.includes("Z")) {
    data.end_at = datetimeLocalToUTC(data.end_at)
  }

  const { data: updated, error } = await supabase
    .from("child_presences")
    .update(data)
    .eq("id", id)
    .select("person_id")
    .single()
  if (error) throw new Error(error.message)
  if (updated) void syncPersonCalendarSafe(updated.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteChildPresence(id: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("child_presences")
    .select("person_id")
    .eq("id", id)
    .single()
  const { error } = await supabase.from("child_presences").delete().eq("id", id)
  if (error) throw new Error(error.message)
  if (existing) void syncPersonCalendarSafe(existing.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

const transitionSchema = z.object({
  person_id: z.string().uuid(),
  transition_at: z.string(),
  direction: z.enum(["pickup", "dropoff"]),
  location: z.string().nullable().optional(),
  recurrence_rule_id: z.string().uuid().nullable().optional(),
  is_exception: z.coerce.boolean().default(false),
  notes: z.string().nullable().optional(),
})

export async function createCustodyTransition(formData: FormData) {
  const supabase = await createClient()
  const data = transitionSchema.parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.transition_at && !data.transition_at.includes("Z")) {
    data.transition_at = datetimeLocalToUTC(data.transition_at)
  }

  const { error } = await supabase.from("custody_transitions").insert(data)
  if (error) throw new Error(error.message)
  void syncPersonCalendarSafe(data.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateCustodyTransition(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = transitionSchema.partial().parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.transition_at && !data.transition_at.includes("Z")) {
    data.transition_at = datetimeLocalToUTC(data.transition_at)
  }

  const { data: updated, error } = await supabase
    .from("custody_transitions")
    .update(data)
    .eq("id", id)
    .select("person_id")
    .single()
  if (error) throw new Error(error.message)
  if (updated) void syncPersonCalendarSafe(updated.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteCustodyTransition(id: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("custody_transitions")
    .select("person_id")
    .eq("id", id)
    .single()
  const { error } = await supabase.from("custody_transitions").delete().eq("id", id)
  if (error) throw new Error(error.message)
  if (existing) void syncPersonCalendarSafe(existing.person_id)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}
