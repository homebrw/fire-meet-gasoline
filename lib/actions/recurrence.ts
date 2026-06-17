"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { generateAndPersistCustodyData, regenerateForRule } from "@/lib/recurrence/persist"
import { datetimeLocalToUTC } from "@/lib/utils"

const ruleSchema = z.object({
  person_id: z.string().uuid(),
  name: z.string().min(1),
  pattern_type: z.enum(["weekly_alternating", "custom_cycle", "manual"]),
  starts_at: z.string(),
  custody_start_time: z.string().default("18:00"),
  custody_end_time: z.string().default("18:00"),
  week_parity: z.enum(["even", "odd"]).nullable().optional(),
  cycle_length_days: z.coerce.number().int().positive().nullable().optional(),
  custody_days: z.array(z.number()).nullable().optional(),
  handoff_location: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export async function createRecurrenceRule(formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  const custody_days_raw = formData.get("custody_days")
  const custody_days = custody_days_raw
    ? String(custody_days_raw).split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const data = ruleSchema.parse({
    ...raw,
    custody_days,
    is_active: true,
  })

  const { data: inserted, error } = await supabase.from("recurrence_rules").insert(data).select().single()
  if (error) throw new Error(error.message)

  // Generate and persist custody data
  await generateAndPersistCustodyData(inserted)

  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateRecurrenceRule(id: string, formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  const custody_days_raw = formData.get("custody_days")
  const custody_days = custody_days_raw
    ? String(custody_days_raw).split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const data = ruleSchema.partial().parse({ ...raw, custody_days })

  const { error } = await supabase.from("recurrence_rules").update(data).eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data with updated rule
  await regenerateForRule(id)

  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteRecurrenceRule(id: string) {
  const supabase = await createClient()

  // Delete generated custody data
  await supabase.from("child_presences").delete().eq("recurrence_rule_id", id)
  await supabase.from("custody_transitions").delete().eq("recurrence_rule_id", id)

  const { error } = await supabase.from("recurrence_rules").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

const exceptionSchema = z.object({
  recurrence_rule_id: z.string().uuid(),
  person_id: z.string().uuid(),
  original_start_at: z.string().nullable().optional(),
  original_end_at: z.string().nullable().optional(),
  override_start_at: z.string().nullable().optional(),
  override_end_at: z.string().nullable().optional(),
  type: z.enum(["cancel", "move", "extend", "shorten", "add"]),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function createRecurrenceException(formData: FormData) {
  const supabase = await createClient()
  const data = exceptionSchema.parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.original_start_at && !data.original_start_at.includes("Z")) {
    data.original_start_at = datetimeLocalToUTC(data.original_start_at)
  }
  if (data.original_end_at && !data.original_end_at.includes("Z")) {
    data.original_end_at = datetimeLocalToUTC(data.original_end_at)
  }
  if (data.override_start_at && !data.override_start_at.includes("Z")) {
    data.override_start_at = datetimeLocalToUTC(data.override_start_at)
  }
  if (data.override_end_at && !data.override_end_at.includes("Z")) {
    data.override_end_at = datetimeLocalToUTC(data.override_end_at)
  }

  const { error } = await supabase.from("recurrence_exceptions").insert(data)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(data.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateRecurrenceException(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = exceptionSchema.partial().parse(Object.fromEntries(formData))

  // Convert datetime-local to UTC
  if (data.original_start_at && !data.original_start_at.includes("Z")) {
    data.original_start_at = datetimeLocalToUTC(data.original_start_at)
  }
  if (data.original_end_at && !data.original_end_at.includes("Z")) {
    data.original_end_at = datetimeLocalToUTC(data.original_end_at)
  }
  if (data.override_start_at && !data.override_start_at.includes("Z")) {
    data.override_start_at = datetimeLocalToUTC(data.override_start_at)
  }
  if (data.override_end_at && !data.override_end_at.includes("Z")) {
    data.override_end_at = datetimeLocalToUTC(data.override_end_at)
  }

  // Fetch the exception to get the rule_id
  const { data: exception, error: fetchError } = await supabase
    .from("recurrence_exceptions")
    .select("recurrence_rule_id")
    .eq("id", id)
    .single()

  if (fetchError || !exception) throw new Error(`Failed to fetch exception: ${fetchError?.message}`)

  const { error } = await supabase.from("recurrence_exceptions").update(data).eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(exception.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteRecurrenceException(id: string) {
  const supabase = await createClient()

  // Fetch the exception to get the rule_id
  const { data: exception, error: fetchError } = await supabase
    .from("recurrence_exceptions")
    .select("recurrence_rule_id")
    .eq("id", id)
    .single()

  if (fetchError || !exception) throw new Error(`Failed to fetch exception: ${fetchError?.message}`)

  const { error } = await supabase.from("recurrence_exceptions").delete().eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(exception.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}
