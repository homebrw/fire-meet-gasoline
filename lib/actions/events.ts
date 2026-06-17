"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  start_at: z.string(),
  end_at: z.string(),
  location: z.string().nullable().optional(),
  owner_person_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid(),
  is_blocking: z.coerce.boolean().default(false),
  is_all_day: z.coerce.boolean().default(false),
  visibility: z.enum(["both", "private"]).optional(),
  allow_participants_to_see_attachments: z.coerce.boolean().default(true),
})

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const data = eventSchema.parse(Object.fromEntries(formData))
  const { data: insertedData, error } = await supabase.from("events").insert(data).select("id")
  if (error) throw new Error(error.message)
  if (!insertedData || insertedData.length === 0) throw new Error("Failed to create event")
  const eventId = insertedData[0].id
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
  return eventId
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = eventSchema.partial().parse(Object.fromEntries(formData))
  const { error } = await supabase.from("events").update(data).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("events").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteAttachment(id: string, storagePath: string) {
  const supabase = await createClient()

  // Delete from Storage first
  await supabase.storage.from("attachments").remove([storagePath])

  const { error } = await supabase.from("event_attachments").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/events")
}

export async function addEventParticipant(
  eventId: string,
  personId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Verify event exists
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("owner_person_id")
    .eq("id", eventId)
    .single()

  if (eventError || !event) {
    throw new Error("Event not found")
  }

  // For individual events, verify user owns the event
  if (event.owner_person_id) {
    const { data: owner } = await supabase
      .from("persons")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!owner || event.owner_person_id !== owner.id) {
      throw new Error("Unauthorized")
    }
  }

  const { error } = await supabase.from("event_participants").insert({
    event_id: eventId,
    person_id: personId,
  })

  if (error) {
    // Ignore unique constraint violation (participant already added)
    if (!error.message.includes("unique")) {
      throw new Error(error.message)
    }
  }

  revalidatePath("/settings/events")
}

export async function removeEventParticipant(
  eventId: string,
  personId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Verify event exists
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("owner_person_id")
    .eq("id", eventId)
    .single()

  if (eventError || !event) {
    throw new Error("Event not found")
  }

  // For individual events, verify user owns the event
  if (event.owner_person_id) {
    const { data: owner } = await supabase
      .from("persons")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!owner || event.owner_person_id !== owner.id) {
      throw new Error("Unauthorized")
    }
  }

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("person_id", personId)

  if (error) throw new Error(error.message)
  revalidatePath("/settings/events")
}

export async function getEventParticipants(eventId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("event_participants")
    .select("person_id, persons(id, name, color)")
    .eq("event_id", eventId)

  if (error) throw new Error(error.message)
  return data || []
}
