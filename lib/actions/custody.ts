"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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
  const { error } = await supabase.from("child_presences").insert(data)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateChildPresence(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = presenceSchema.partial().parse(Object.fromEntries(formData))
  const { error } = await supabase.from("child_presences").update(data).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteChildPresence(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("child_presences").delete().eq("id", id)
  if (error) throw new Error(error.message)
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
  const { error } = await supabase.from("custody_transitions").insert(data)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateCustodyTransition(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = transitionSchema.partial().parse(Object.fromEntries(formData))
  const { error } = await supabase.from("custody_transitions").update(data).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteCustodyTransition(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("custody_transitions").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}
