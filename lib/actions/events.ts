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
  type: z.enum(["shared", "individual"]),
  owner_person_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid(),
  is_blocking: z.coerce.boolean().default(false),
  visibility: z.enum(["both", "private"]).default("both"),
})

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const data = eventSchema.parse(Object.fromEntries(formData))
  const { error } = await supabase.from("events").insert(data)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/events")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
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
